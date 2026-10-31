package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.contributor.ApplicationView;
import com.example.citizen_journalism.dto.contributor.ApplyContributorRequest;
import com.example.citizen_journalism.dto.contributor.ContributorEligibility;
import com.example.citizen_journalism.dto.contributor.ContributorOverview;
import com.example.citizen_journalism.dto.editor.ApplicationListItem;
import com.example.citizen_journalism.dto.editor.EditorApplicationDetail;
import com.example.citizen_journalism.dto.editor.ReviewApplicationRequest;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.ContributorApplication.Status;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ContributorApplicationRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.ExpertiseFields;
import com.example.citizen_journalism.util.Paging;
import com.example.citizen_journalism.util.VietnamProvinces;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * NGHIỆP VỤ ĐĂNG KÝ LÀM CỘNG TÁC VIÊN (xem quy trình trong entity ContributorApplication).
 *
 * PHẦN NGƯỜI DÂN (ContributorApplicationController, mục "Cộng tác viên" trong trang Hồ sơ):
 *   - getOverview : điều kiện đăng ký + đơn hiện tại + lịch sử + dữ liệu cho form (1 lần gọi)
 *   - apply       : nộp đơn kèm giấy tờ (chỉ khi đủ điều kiện)
 *   - withdraw    : rút đơn khi Biên tập viên chưa xét
 * PHẦN BIÊN TẬP VIÊN (EditorController):
 *   - listForEditor / getForEditor : danh sách, chi tiết đơn + hồ sơ người nộp
 *   - review      : chuyển Phó Tổng biên tập phê duyệt, hoặc từ chối (kèm lý do)
 * Cả hai bên xem giấy tờ qua openDocument (giấy tờ tuỳ thân KHÔNG để công khai).
 *
 * ĐIỀU KIỆN ĐĂNG KÝ (ngưỡng chỉnh trong application.properties):
 *   tài khoản người dân · hồ sơ có CCCD, ngày sinh, địa chỉ · đủ app.contributor.min-age tuổi ·
 *   điểm uy tín >= app.contributor.min-reputation · không có đơn khác đang chờ xét.
 */
@Service
@RequiredArgsConstructor
public class ContributorApplicationService {

    /** Giấy tờ: tối đa 4 tệp (2 mặt CCCD + thẻ nhà báo / chứng chỉ), mỗi tệp 5MB. */
    public static final int MAX_FILES = 4;
    public static final long MAX_FILE_BYTES = 5L * 1024 * 1024;

    /** Thư mục lưu giấy tờ. Bị chặn truy cập trực tiếp qua /uploads/applications/** (SecurityConfig). */
    public static final String DOCUMENT_FOLDER = "applications";

    private final ContributorApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final FileStorageService fileStorageService;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    @Value("${app.contributor.min-reputation:80}")
    private int minReputation;

    @Value("${app.contributor.min-age:18}")
    private int minAge;

    /** Một giấy tờ lưu trong cột documents (JSON). url = đường dẫn nội bộ, KHÔNG gửi ra frontend. */
    private record StoredDocument(String name, String url, String contentType, long size) {
    }

    /** Tệp trả về cho controller để gửi về trình duyệt. */
    public record DocumentFile(Resource resource, String fileName, String contentType) {
    }

    // ================================ PHẦN NGƯỜI DÂN ================================

    @Transactional(readOnly = true)
    public ContributorOverview getOverview(String userId) {
        User user = userRepository.getActiveById(userId);
        List<ContributorApplication> applications = applicationRepository.findByApplicantIdOrderByCreatedAtDescIdDesc(userId);
        List<ApplicationView> views = applications.stream().map(this::toView).toList();
        return new ContributorOverview(
                user.getRole(),
                checkEligibility(user, applications),
                views.isEmpty() ? null : views.get(0),
                views.size() > 1 ? views.subList(1, views.size()) : List.of(),
                new ContributorOverview.FormOptions(
                        ExpertiseFields.ALL,
                        ExpertiseFields.MAX_SELECTED,
                        VietnamProvinces.ALL,
                        MAX_FILES,
                        MAX_FILE_BYTES / 1024 / 1024,
                        MAX_FILES * MAX_FILE_BYTES / 1024 / 1024,
                        FileStorageService.DOCUMENT_TYPES.keySet().stream().sorted().toList()));
    }

    @Transactional
    public ApplicationView apply(String userId, ApplyContributorRequest request, List<MultipartFile> files) {
        User user = userRepository.getActiveById(userId);
        List<MultipartFile> documents = files == null ? List.of() : files;

        // 1. Đủ điều kiện chưa? (chống gọi API thẳng khi giao diện đã khoá nút)
        ContributorEligibility eligibility = checkEligibility(user,
                applicationRepository.findByApplicantIdOrderByCreatedAtDescIdDesc(userId));
        eligibility.checks().stream().filter(check -> !check.passed()).findFirst().ifPresent(check -> {
            throw AppException.badRequest("Bạn chưa đủ điều kiện đăng ký: " + check.label() + ". " + check.hint());
        });

        // 2. Kiểm tra dữ liệu mà annotation không làm được, gom lỗi theo từng ô
        validate(request, documents);

        // 3. Lưu giấy tờ (lỗi giữa chừng thì xoá các tệp đã lưu, DB tự huỷ nhờ @Transactional)
        List<StoredDocument> stored = new ArrayList<>();
        try {
            for (MultipartFile file : documents) {
                String url = fileStorageService.store(file, DOCUMENT_FOLDER, userId,
                        FileStorageService.DOCUMENT_TYPES, MAX_FILE_BYTES);
                stored.add(new StoredDocument(FileStorageService.originalName(file, "giay-to"), url,
                        file.getContentType(), file.getSize()));
            }
        } catch (RuntimeException ex) {
            stored.forEach(document -> fileStorageService.delete(document.url()));
            throw ex;
        }

        // 4. Lưu đơn
        ContributorApplication application = applicationRepository.save(ContributorApplication.builder()
                .applicant(user)
                .status(Status.PENDING_EDITOR)
                .expertiseFields(String.join(",", request.expertiseFields().stream().distinct().toList()))
                .province(request.province())
                .occupation(request.occupation().trim())
                .availability(request.availability())
                .experience(request.experience().trim())
                .documents(objectMapper.writeValueAsString(stored))
                .build());
        user.setUpgradeStatus(User.UpgradeStatus.PENDING); // Cột tóm tắt trạng thái nâng cấp trên bảng users
        return toView(application);
    }

    @Transactional
    public ApplicationView withdraw(String userId, Long applicationId) {
        ContributorApplication application = findOwned(userId, applicationId);
        if (application.getStatus() != Status.PENDING_EDITOR) {
            throw AppException.badRequest("Chỉ rút được đơn khi Biên tập viên chưa xét duyệt.");
        }
        application.setStatus(Status.WITHDRAWN);
        application.setWithdrawnAt(LocalDateTime.now());
        application.getApplicant().setUpgradeStatus(User.UpgradeStatus.NONE);
        return toView(application);
    }

    @Transactional(readOnly = true)
    public DocumentFile openMyDocument(String userId, Long applicationId, int index) {
        return documentFile(findOwned(userId, applicationId), index);
    }

    // ================================ PHẦN BIÊN TẬP VIÊN ================================

    /** @param status null = mọi trạng thái */
    @Transactional(readOnly = true)
    public PageResponse<ApplicationListItem> listForEditor(Status status, int page, int size) {
        Set<Status> statuses = status == null ? EnumSet.allOf(Status.class) : EnumSet.of(status);
        // Đơn chờ xét: cũ nhất trước (ai nộp trước xét trước); các danh sách khác: mới nhất trước
        Sort sort = status == Status.PENDING_EDITOR ? Paging.OLDEST_FIRST : Paging.NEWEST_FIRST;
        return PageResponse.from(applicationRepository.findByStatusIn(statuses, Paging.of(page, size, sort))
                .map(this::toListItem));
    }

    /** Vài đơn chờ xét mới nhất + tổng số (cho trang Tổng quan của Biên tập viên). */
    @Transactional(readOnly = true)
    public List<ApplicationListItem> latestPending(int limit) {
        PageRequest pageable = PageRequest.of(0, limit, Paging.NEWEST_FIRST);
        return applicationRepository.findByStatusIn(EnumSet.of(Status.PENDING_EDITOR), pageable).map(this::toListItem).getContent();
    }

    public long countPendingForEditor() {
        return applicationRepository.countByStatus(Status.PENDING_EDITOR);
    }

    @Transactional(readOnly = true)
    public EditorApplicationDetail getForEditor(Long applicationId) {
        return toEditorDetail(findForStaff(applicationId));
    }

    /**
     * Biên tập viên xét đơn (chỉ khi đơn đang chờ Biên tập viên):
     *   FORWARD -> chờ Phó Tổng biên tập phê duyệt;  REJECT -> từ chối, BẮT BUỘC có lý do.
     * Xong thì gửi email báo kết quả cho người nộp.
     */
    @Transactional
    public EditorApplicationDetail review(String editorId, Long applicationId, ReviewApplicationRequest request) {
        User editor = userRepository.getActiveById(editorId);
        ContributorApplication application = findForStaff(applicationId);
        if (application.getStatus() != Status.PENDING_EDITOR) {
            throw AppException.conflict("Đơn này đã được xử lý hoặc người nộp đã rút đơn.");
        }
        String note = blankToNull(request.note());
        boolean reject = request.decision() == ReviewApplicationRequest.Decision.REJECT;
        if (reject && (note == null || note.length() < 10)) {
            throw AppException.invalidFields(Map.of("note", "Vui lòng ghi rõ lý do từ chối (ít nhất 10 ký tự)."));
        }

        application.setEditor(editor);
        application.setEditorNote(note);
        application.setEditorReviewedAt(LocalDateTime.now());
        application.setStatus(reject ? Status.REJECTED : Status.PENDING_DEPUTY);
        if (reject) {
            application.getApplicant().setUpgradeStatus(User.UpgradeStatus.REJECTED);
        }
        notifyApplicant(application, reject);
        return toEditorDetail(application);
    }

    @Transactional(readOnly = true)
    public DocumentFile openDocumentForStaff(Long applicationId, int index) {
        return documentFile(findForStaff(applicationId), index);
    }

    // ================================ HÀM PHỤ ================================

    @Transactional(readOnly = true)
    public PageResponse<ApplicationListItem> listForLeadership(int page, int size) {
        return PageResponse.from(applicationRepository.findByStatusIn(List.of(Status.PENDING_DEPUTY),
                Paging.of(page, size, Paging.NEWEST_FIRST)).map(this::toListItem));
    }

    @Transactional
    public EditorApplicationDetail finalReview(String deputyId, Long applicationId, boolean approve, String note) {
        User deputy = userRepository.getActiveById(deputyId);
        if (deputy.getRole() != User.Role.DEPUTY_EIC) {
            throw AppException.badRequest("Chỉ Phó Tổng biên tập được duyệt đơn CTV.");
        }
        ContributorApplication application = applicationRepository.findForDecision(applicationId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy đơn."));
        if (application.getStatus() != Status.PENDING_DEPUTY) throw AppException.conflict("Đơn không còn chờ duyệt.");
        String message = blankToNull(note);
        if (!approve && (message == null || message.length() < 10)) throw AppException.badRequest("Lý do từ chối cần ít nhất 10 ký tự.");
        User applicant = application.getApplicant();
        if (approve && (applicant.getRole() != User.Role.CITIZEN || applicant.getStatus() != User.Status.ACTIVE))
            throw AppException.conflict("Tài khoản không còn đủ điều kiện nâng cấp CTV.");
        application.setDeputy(deputy); application.setDeputyNote(message); application.setDeputyReviewedAt(LocalDateTime.now());
        application.setStatus(approve ? Status.APPROVED : Status.REJECTED);
        applicant.setUpgradeStatus(approve ? User.UpgradeStatus.APPROVED : User.UpgradeStatus.REJECTED);
        if (approve) applicant.setRole(User.Role.CONTRIBUTOR);
        mailService.trySend(applicant.getEmail(), "Kết quả đăng ký Cộng tác viên", MailService.layout(
                "<p>Đơn đăng ký: " + (approve ? "Đã phê duyệt" : "Đã từ chối") + "</p><p>" + MailService.escape(message == null ? "" : message) + "</p>"));
        return toEditorDetail(application);
    }

    /** Từng điều kiện đăng ký (thứ tự = thứ tự hiển thị). */
    private ContributorEligibility checkEligibility(User user, List<ContributorApplication> applications) {
        boolean profileComplete = blankToNull(user.getCitizenId()) != null && user.getDateOfBirth() != null
                && blankToNull(user.getAddress()) != null;
        LocalDate birthday = user.getDateOfBirth();
        boolean oldEnough = birthday != null && Period.between(birthday, LocalDate.now()).getYears() >= minAge;
        int reputation = user.getReputationScore() == null ? 0 : user.getReputationScore();
        boolean noActive = applications.stream().noneMatch(application -> application.getStatus().isActive());

        return ContributorEligibility.of(List.of(
                new ContributorEligibility.Check("role", "Tài khoản người dân",
                        user.getRole() == User.Role.CITIZEN,
                        user.getRole() == User.Role.CONTRIBUTOR ? "Bạn đã là Cộng tác viên." : "Chỉ tài khoản người dân mới đăng ký được."),
                new ContributorEligibility.Check("profile", "Hồ sơ có đủ số CCCD, ngày sinh và địa chỉ", profileComplete,
                        "Bổ sung trong mục Thông tin cá nhân ở trên rồi bấm Lưu."),
                new ContributorEligibility.Check("age", "Đủ " + minAge + " tuổi trở lên", oldEnough,
                        birthday == null ? "Cần cập nhật ngày sinh trong hồ sơ." : "Bạn chưa đủ tuổi đăng ký."),
                new ContributorEligibility.Check("reputation", "Điểm uy tín từ " + minReputation + " trở lên",
                        reputation >= minReputation, "Điểm uy tín hiện tại: " + reputation + "."),
                new ContributorEligibility.Check("pending", "Không có đơn khác đang chờ xét duyệt", noActive,
                        "Vui lòng chờ kết quả đơn hiện tại.")));
    }

    /** Gom lỗi theo ô (tên khoá trùng tên ô ở frontend). */
    private void validate(ApplyContributorRequest request, List<MultipartFile> files) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (!ExpertiseFields.ALL.containsAll(request.expertiseFields())) {
            errors.put("expertiseFields", "Lĩnh vực không hợp lệ.");
        }
        if (!VietnamProvinces.isValid(request.province())) {
            errors.put("province", "Tỉnh/thành phố không hợp lệ.");
        }
        if (files.isEmpty()) {
            errors.put("files", "Vui lòng tải lên ảnh CCCD (2 mặt) hoặc giấy tờ tuỳ thân.");
        } else if (files.size() > MAX_FILES) {
            errors.put("files", "Chỉ được tải lên tối đa " + MAX_FILES + " tệp.");
        } else {
            try {
                files.forEach(file -> fileStorageService.validate(file, FileStorageService.DOCUMENT_TYPES, MAX_FILE_BYTES));
            } catch (AppException ex) {
                errors.put("files", ex.getMessage());
            }
        }
        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }
    }

    /** Đơn của chính người này; đơn người khác -> báo không tìm thấy (không lộ là đơn có tồn tại). */
    private ContributorApplication findOwned(String userId, Long applicationId) {
        return applicationRepository.findWithApplicantById(applicationId)
                .filter(application -> application.getApplicant().getId().equals(userId))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy đơn đăng ký."));
    }

    private ContributorApplication findForStaff(Long applicationId) {
        return applicationRepository.findWithApplicantById(applicationId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy đơn đăng ký."));
    }

    private List<StoredDocument> documentsOf(ContributorApplication application) {
        if (application.getDocuments() == null) {
            return List.of();
        }
        // TypeReference: cho Jackson biết cần đọc JSON thành List<StoredDocument> (Java không tự giữ kiểu bên trong <>)
        return objectMapper.readValue(application.getDocuments(), new TypeReference<List<StoredDocument>>() {
        });
    }

    private DocumentFile documentFile(ContributorApplication application, int index) {
        List<StoredDocument> documents = documentsOf(application);
        if (index < 0 || index >= documents.size()) {
            throw AppException.notFound("Không tìm thấy tệp.");
        }
        StoredDocument document = documents.get(index);
        return new DocumentFile(fileStorageService.load(document.url()), document.name(), document.contentType());
    }

    private ApplicationView toView(ContributorApplication application) {
        List<StoredDocument> documents = documentsOf(application);
        return new ApplicationView(
                application.getId(),
                application.getStatus(),
                splitFields(application.getExpertiseFields()),
                application.getProvince(),
                application.getOccupation(),
                application.getAvailability(),
                application.getExperience(),
                IntStream.range(0, documents.size())
                        .mapToObj(i -> new ApplicationView.Document(i, documents.get(i).name(),
                                documents.get(i).contentType(), documents.get(i).size()))
                        .toList(),
                application.getCreatedAt(),
                application.getEditorNote(),
                application.getEditorReviewedAt(),
                application.getDeputyNote(),
                application.getDeputyReviewedAt(),
                application.getWithdrawnAt());
    }

    private ApplicationListItem toListItem(ContributorApplication application) {
        User applicant = application.getApplicant();
        return new ApplicationListItem(application.getId(), applicant.getId(), applicant.getFullName(),
                applicant.getEmail(), applicant.getAvatarUrl(), applicant.getReputationScore(),
                application.getProvince(), splitFields(application.getExpertiseFields()),
                application.getStatus(), application.getCreatedAt());
    }

    private EditorApplicationDetail toEditorDetail(ContributorApplication application) {
        User user = application.getApplicant();
        return new EditorApplicationDetail(toView(application), new EditorApplicationDetail.Applicant(
                user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getCitizenId(),
                user.getDateOfBirth(), user.getAddress(), user.getAvatarUrl(), user.getReputationScore(),
                user.getCreatedAt(), submissionRepository.countByAuthorId(user.getId())));
    }

    private static List<String> splitFields(String value) {
        return value == null || value.isBlank() ? List.of() : Arrays.asList(value.split(","));
    }

    /** Email báo kết quả xét duyệt. Gửi lỗi thì chỉ ghi log (trySend), không làm hỏng thao tác của Biên tập viên. */
    private void notifyApplicant(ContributorApplication application, boolean rejected) {
        User user = application.getApplicant();
        String result = rejected
                ? "Rất tiếc, đơn đăng ký Cộng tác viên của bạn <b>chưa được chấp nhận</b>."
                : "Đơn đăng ký Cộng tác viên của bạn đã được Biên tập viên <b>chấp thuận</b> và chuyển lên Phó Tổng biên tập phê duyệt.";
        String note = application.getEditorNote() == null ? ""
                : "<p style=\"padding:12px 16px;background:#f5f7fb;border-radius:8px\">Ghi chú của toà soạn: "
                + MailService.escape(application.getEditorNote()) + "</p>";
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>%s</p>
                  %s
                  <p>Xem chi tiết trong mục <b>Hồ sơ của tôi → Cộng tác viên</b>.</p>
                """.formatted(MailService.escape(user.getFullName()), result, note));
        mailService.trySend(user.getEmail(), "[Tin Nóng Dân Sinh] Cập nhật đơn đăng ký Cộng tác viên", html);
    }
}
