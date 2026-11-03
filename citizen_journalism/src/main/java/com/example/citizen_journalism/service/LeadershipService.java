package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.VerificationReviewResponse;
import com.example.citizen_journalism.dto.research.ResearchArticleView;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.EditoralReview.ReviewAction;
import com.example.citizen_journalism.entity.EditoralReview.ReviewRole;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.exception.ErrorCode;
import com.example.citizen_journalism.repository.LeadershipRepository;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BÀN DUYỆT CỦA BAN BIÊN TẬP: Phó Tổng biên tập (DEPUTY_EIC) và Tổng biên tập (EIC) duyệt những gì Biên tập viên
 * đã chuyển lên — hồ sơ phản ánh (tin nóng, khiếu nại, phóng sự điều tra) và bài nghiên cứu của Chuyên gia.
 * Luồng: routes/leadership/*.jsx -> services/leadershipService.js -> LeadershipController -> service này
 *        -> LeadershipRepository / SubmissionEventService.
 *
 * AI XEM GÌ:
 *   - Phó TBT: hồ sơ / bài đang DEPUTY_PENDING thuộc chuyên mục mình phụ trách (hồ sơ: submissions.category_id;
 *     bài nghiên cứu: lĩnh vực trùng tên chuyên mục). Hồ sơ chưa có ai phụ trách thì Phó TBT nào cũng thấy.
 *   - Tổng biên tập: hồ sơ / bài đang EIC_PENDING (chỉ tin BREAKING mới lên tới đây).
 *
 * 4 QUYẾT ĐỊNH (Decision):
 *   - APPROVE      : duyệt, cho phép xuất bản -> READY_FOR_PUBLISHING. Phó TBT KHÔNG được duyệt tin Breaking
 *                    (đã có priority = BREAKING hoặc vừa tick dấu hiệu Breaking) -> phải chuyển Tổng biên tập.
 *   - ESCALATE     : chỉ Phó TBT, bắt buộc tick ít nhất 1 dấu hiệu Breaking -> EIC_PENDING, priority = BREAKING.
 *   - REQUEST_EDIT : bắt buộc ghi chú cần sửa gì -> trả về Biên tập viên (hồ sơ về IN_REVIEW để BTV làm lại các bước
 *                    như thường; bài nghiên cứu về "chờ BTV duyệt"). Email báo BTV.
 *   - REJECT       : bắt buộc lý do -> EIC_REJECTED ("Ban biên tập quyết định không đăng tải"), dừng xử lý.
 *     Không dùng REJECTED vì trạng thái đó nghĩa là "BTV không tiếp nhận" và có màn hình riêng đọc theo nó.
 *
 * LƯU Ở ĐÂU (không thêm bảng / cột):
 *   - submissions.status (+ priority khi chuyển TBT) hoặc research_articles.review_status (+ priority)
 *   - editorial_reviews: 1 dòng / quyết định, review_role = DEPUTY_EIC | EIC, action = APPROVE | ESCALATE |
 *     REQUEST_EDIT | REJECT, comments = ghi chú NỘI BỘ (người gửi không thấy). Dòng của Ban biên tập để status = null.
 *   - submission_events (người gửi đọc được): chỉ ghi câu mô tả chung, KHÔNG ghi ghi chú nội bộ.
 */
@Service
@RequiredArgsConstructor
public class LeadershipService {

    private final LeadershipRepository repository;
    private final SubmissionRepository submissionRepository;
    private final ResearchArticleRepository researchArticleRepository;
    private final UserRepository userRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;
    private final SubmissionVerificationReviewService verificationReviewService;
    private final ResearchArticleService researchArticleService;
    private final MailService mailService;

    // ============================== DỮ LIỆU GỬI / NHẬN ==============================

    public enum Kind { SUBMISSION, RESEARCH }

    public enum Decision { APPROVE, ESCALATE, REQUEST_EDIT, REJECT }

    /** Dấu hiệu Breaking (cùng tiêu chuẩn với bài nghiên cứu ở ResearchEditorialService). */
    public enum BreakingSign {
        NATIONAL_SENSITIVE,        // Nhạy cảm cấp quốc gia: chủ quyền, quốc phòng - an ninh, tôn giáo, dân tộc, đối ngoại
        WIDE_PUBLIC_HARM,          // Nguy hại tới tính mạng / sức khoẻ / tài sản đang xảy ra, từ nhiều tỉnh trở lên
        NATIONAL_STATE_CRITICISM   // Phê phán cơ quan nhà nước, cán bộ cụ thể ở phạm vi toàn quốc
    }

    /** breakingSigns: các dấu hiệu Breaking Phó TBT tick (không tick = rỗng / null). */
    public record DecisionBody(
            @NotNull(message = "Vui lòng chọn quyết định.") Decision decision,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự.") String note,
            List<BreakingSign> breakingSigns) {
    }

    /** 1 dòng ở Bàn duyệt. Hồ sơ: code = mã KB-..., researchId = null. Bài nghiên cứu: code = "NC-<id>". */
    public record QueueItem(Kind kind, String code, Long researchId, String title, String type, String field,
                            String editorName, String priority, String status, LocalDateTime sentAt) {
    }

    /** 1 ý kiến / quyết định của toà soạn (BTV hoặc Ban biên tập) đọc từ editorial_reviews. */
    public record Note(String reviewerName, ReviewRole role, ReviewAction action, String comments, LocalDateTime createdAt) {
    }

    /**
     * Chi tiết 1 hồ sơ cho Ban biên tập.
     * @param verification kết quả xác minh của CTV (nhiệm vụ + bài / báo cáo); null nếu hồ sơ không giao CTV
     * @param notes        ý kiến của BTV và Ban biên tập, cũ trước
     * @param actionable   hồ sơ đang chờ đúng vai trò người xem duyệt
     */
    public record SubmissionReview(SubmissionDetail detail, String categoryName, String editorName,
                                   Submission.Priority priority, Verification verification, List<Note> notes,
                                   boolean actionable) {
    }

    public record Verification(VerificationReviewResponse.Assignment assignment, VerificationReviewResponse.Report report) {
    }

    /** Chi tiết 1 bài nghiên cứu cho Ban biên tập. */
    public record ResearchReview(ResearchArticleView article, String authorName, ResearchArticle.ReviewStatus reviewStatus,
                                 ResearchArticle.Priority priority, List<Note> notes, boolean actionable) {
    }

    private static final int MIN_REASON_LENGTH = 10;

    /** Trạng thái hồ sơ đang chờ từng vai trò duyệt. */
    private static final Map<User.Role, SubmissionStatus> WAITING_STATUS = Map.of(
            User.Role.DEPUTY_EIC, SubmissionStatus.DEPUTY_PENDING,
            User.Role.EIC, SubmissionStatus.EIC_PENDING);

    // ============================== DANH SÁCH ==============================

    /**
     * Bàn duyệt: hồ sơ / bài đang chờ VAI TRÒ của người xem, gửi lên cũ nhất trước (chờ lâu xử lý trước).
     * @param type    loại hồ sơ HOT_NEWS / COMPLAINT / INVESTIGATION (null = tất cả, bỏ qua với bài nghiên cứu)
     * @param keyword mã hoặc tiêu đề (null / rỗng = không lọc)
     */
    @Transactional(readOnly = true)
    public PageResponse<QueueItem> listQueue(String userId, Kind kind, Submission.ReportCategory type, String keyword,
                                             int page, int size) {
        User user = userRepository.getActiveById(userId);
        SubmissionStatus waiting = waitingStatusOf(user);
        String safeKeyword = TextUtils.blankToNull(keyword);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        if (kind == Kind.RESEARCH) {
            // Phó TBT chỉ thấy bài thuộc lĩnh vực mình phụ trách; Tổng biên tập thấy mọi bài BREAKING
            String deputyId = user.getRole() == User.Role.DEPUTY_EIC ? user.getId() : null;
            return PageResponse.from(repository.searchResearch(ResearchArticle.ReviewStatus.valueOf(waiting.name()),
                            safeKeyword == null ? null : safeKeyword.trim(), deputyId,
                            PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.asc("updatedAt"), Sort.Order.asc("id"))))
                    .map(this::queueItemOf));
        }
        String deputyId = user.getRole() == User.Role.DEPUTY_EIC ? user.getId() : null;
        return PageResponse.from(repository.searchSubmissions(waiting, type, safeKeyword == null ? null : safeKeyword.trim(),
                        deputyId, PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.asc("updatedAt"), Sort.Order.asc("id"))))
                .map(LeadershipService::queueItemOf));
    }

    // ============================== HỒ SƠ PHẢN ÁNH ==============================

    @Transactional(readOnly = true)
    public SubmissionReview getSubmission(String userId, String trackingCode) {
        User user = userRepository.getActiveById(userId);
        return toReview(user, findSubmissionFor(user, trackingCode));
    }

    @Transactional
    public SubmissionReview decideSubmission(String userId, String trackingCode, DecisionBody body) {
        User user = userRepository.getActiveById(userId);
        Submission submission = findSubmissionFor(user, trackingCode);
        if (submission.getStatus() != waitingStatusOf(user)) {
            throw AppException.conflict("Hồ sơ không ở bước chờ bạn duyệt (có thể người khác vừa xử lý). Vui lòng tải lại trang.");
        }
        String note = checkDecision(user, body, submission.getPriority() == Submission.Priority.BREAKING);
        SubmissionEvent.Actor actor = user.getRole() == User.Role.EIC ? SubmissionEvent.Actor.EIC : SubmissionEvent.Actor.DEPUTY_EIC;
        User eic = null;

        switch (body.decision()) {
            case APPROVE -> eventService.record(submission, SubmissionStatus.READY_FOR_PUBLISHING, actor,
                    "Ban biên tập đã duyệt bài, chờ đăng tải.", null);
            case ESCALATE -> {
                eic = requireEic();
                submission.setPriority(Submission.Priority.BREAKING); // JPA tự ghi xuống DB khi hết transaction
                eventService.record(submission, SubmissionStatus.EIC_PENDING, actor,
                        "Phó Tổng biên tập chuyển Tổng biên tập phê duyệt.", null);
            }
            case REQUEST_EDIT -> eventService.record(submission, SubmissionStatus.IN_REVIEW, actor,
                    "Ban biên tập yêu cầu biên tập lại hồ sơ.", null);
            case REJECT -> eventService.record(submission, SubmissionStatus.EIC_REJECTED, actor,
                    "Ban biên tập quyết định không đăng tải.", null);
        }
        repository.save(reviewRow(user, body.decision(), note).submission(submission).build());

        String label = "hồ sơ <b>%s</b> \"%s\"".formatted(submission.getTrackingCode(), MailService.escape(submission.getTitle()));
        notifyAfterDecision(user, body.decision(), note, label, submission.getAssignedEditor(), eic);
        return toReview(user, submission);
    }

    // ============================== BÀI NGHIÊN CỨU ==============================

    @Transactional(readOnly = true)
    public ResearchReview getResearch(String userId, Long articleId) {
        User user = userRepository.getActiveById(userId);
        return toReview(user, findResearchFor(user, articleId));
    }

    @Transactional
    public ResearchReview decideResearch(String userId, Long articleId, DecisionBody body) {
        User user = userRepository.getActiveById(userId);
        ResearchArticle article = findResearchFor(user, articleId);
        if (article.getReviewStatus() == null || !article.getReviewStatus().name().equals(waitingStatusOf(user).name())) {
            throw AppException.conflict("Bài không ở bước chờ bạn duyệt (có thể người khác vừa xử lý). Vui lòng tải lại trang.");
        }
        String note = checkDecision(user, body, article.getPriority() == ResearchArticle.Priority.BREAKING);
        User eic = null;

        // JPA tự ghi các thay đổi xuống DB khi hết transaction, không cần save bài
        switch (body.decision()) {
            case APPROVE -> article.setReviewStatus(ResearchArticle.ReviewStatus.READY_FOR_PUBLISHING);
            case ESCALATE -> {
                eic = requireEic();
                article.setReviewStatus(ResearchArticle.ReviewStatus.EIC_PENDING);
                article.setPriority(ResearchArticle.Priority.BREAKING);
            }
            case REQUEST_EDIT -> {
                // Về "chờ BTV duyệt": BTV sửa / yêu cầu Chuyên gia chỉnh sửa rồi chấm điểm, duyệt lại từ đầu
                article.setReviewStatus(null);
                article.setPriority(null);
            }
            case REJECT -> article.setReviewStatus(ResearchArticle.ReviewStatus.EIC_REJECTED);
        }
        repository.save(reviewRow(user, body.decision(), note).researchArticle(article).build());

        String label = "bài nghiên cứu <b>NC-%d</b> \"%s\"".formatted(article.getId(), MailService.escape(article.getTitle()));
        notifyAfterDecision(user, body.decision(), note, label, lastApprovingEditor(article), eic);
        notifyAuthor(article, body.decision());
        return toReview(user, article);
    }

    // ============================== Ý KIẾN CHO BIÊN TẬP VIÊN ==============================

    /** Ý kiến của Ban biên tập trên 1 hồ sơ (BTV xem để biết cần sửa gì). Mới nhất trước. */
    @Transactional(readOnly = true)
    public List<Note> submissionNotes(String trackingCode) {
        return leadershipOnly(notesOf(repository.findBySubmissionIdOrderByIdAsc(findSubmission(trackingCode).getId())));
    }

    @Transactional(readOnly = true)
    public List<Note> researchNotes(Long articleId) {
        return leadershipOnly(notesOf(repository.findByResearchArticleIdOrderByIdAsc(findResearch(articleId).getId())));
    }

    // ============================== HÀM PHỤ ==============================

    /** Vai trò -> trạng thái đang chờ vai trò đó duyệt. Vai trò khác không vào được (SecurityConfig đã chặn, đây là chốt thứ 2). */
    private static SubmissionStatus waitingStatusOf(User user) {
        SubmissionStatus status = WAITING_STATUS.get(user.getRole());
        if (status == null) {
            throw AppException.forbidden("Chỉ Phó Tổng biên tập / Tổng biên tập được dùng bàn duyệt.", ErrorCode.FORBIDDEN);
        }
        return status;
    }

    /**
     * Kiểm tra quyết định theo tiêu chuẩn, trả về ghi chú đã làm sạch.
     * @param alreadyBreaking hồ sơ / bài đã được phân loại BREAKING từ trước
     */
    private static String checkDecision(User user, DecisionBody body, boolean alreadyBreaking) {
        String note = TextUtils.blankToNull(body.note());
        note = note == null ? null : note.trim();
        boolean hasSigns = body.breakingSigns() != null && !body.breakingSigns().isEmpty();
        boolean deputy = user.getRole() == User.Role.DEPUTY_EIC;

        switch (body.decision()) {
            case APPROVE -> {
                if (deputy && (alreadyBreaking || hasSigns)) {
                    throw AppException.invalidFields(Map.of("breakingSigns",
                            "Tin có dấu hiệu Breaking chỉ Tổng biên tập được duyệt. Hãy chọn \"Chuyển Tổng biên tập\"."));
                }
            }
            case ESCALATE -> {
                if (!deputy) {
                    throw AppException.badRequest("Chỉ Phó Tổng biên tập chuyển tin lên Tổng biên tập.");
                }
                if (!hasSigns) {
                    throw AppException.invalidFields(Map.of("breakingSigns",
                            "Chọn ít nhất 1 dấu hiệu Breaking để chuyển Tổng biên tập."));
                }
            }
            case REQUEST_EDIT, REJECT -> {
                if (note == null || note.length() < MIN_REASON_LENGTH) {
                    String what = body.decision() == Decision.REJECT ? "lý do từ chối" : "nội dung cần chỉnh sửa";
                    throw AppException.invalidFields(Map.of("note",
                            "Vui lòng nhập %s (tối thiểu %d ký tự).".formatted(what, MIN_REASON_LENGTH)));
                }
            }
        }
        // Lưu kèm các dấu hiệu Breaking vào ghi chú để người duyệt sau biết vì sao tin được chuyển lên
        if (body.decision() == Decision.ESCALATE) {
            String signs = "Dấu hiệu Breaking: " + String.join(", ", body.breakingSigns().stream().map(LeadershipService::signLabel).toList());
            note = note == null ? signs : signs + "\n" + note;
        }
        return note;
    }

    private static String signLabel(BreakingSign sign) {
        return switch (sign) {
            case NATIONAL_SENSITIVE -> "nhạy cảm cấp quốc gia";
            case WIDE_PUBLIC_HARM -> "nguy hại đang xảy ra từ nhiều tỉnh trở lên";
            case NATIONAL_STATE_CRITICISM -> "phê phán cơ quan nhà nước ở phạm vi toàn quốc";
        };
    }

    private User requireEic() {
        return userRepository.findFirstByRoleAndStatusOrderByIdAsc(User.Role.EIC, User.Status.ACTIVE)
                .orElseThrow(() -> AppException.conflict(
                        "Hệ thống chưa có tài khoản Tổng biên tập đang hoạt động. Vui lòng liên hệ quản trị viên."));
    }

    private static EditoralReview.EditoralReviewBuilder reviewRow(User user, Decision decision, String note) {
        return EditoralReview.builder()
                .reviewer(user)
                .reviewRole(user.getRole() == User.Role.EIC ? ReviewRole.EIC : ReviewRole.DEPUTY_EIC)
                .action(ReviewAction.valueOf(decision.name()))
                .comments(note);
    }

    /** Email nội bộ: chuyển TBT -> báo TBT; trả về / từ chối / duyệt -> báo BTV đã duyệt. Gửi lỗi không làm hỏng thao tác. */
    private void notifyAfterDecision(User user, Decision decision, String note, String label, User editor, User eic) {
        String who = (user.getRole() == User.Role.EIC ? "Tổng biên tập" : "Phó Tổng biên tập") + " <b>%s</b>"
                .formatted(MailService.escape(user.getFullName()));
        String noteHtml = note == null ? "" : MailService.box(MailService.escape(note).replace("\n", "<br>"));
        if (decision == Decision.ESCALATE && eic != null) {
            mail(eic, "[Tin Nóng Dân Sinh] Tin Breaking chờ Tổng biên tập duyệt",
                    who + " đã chuyển " + label + " lên bạn phê duyệt.</p>" + noteHtml + "<p>");
        }
        // BTV chỉ nhận việc cần làm (sửa lại / bị dừng), ghi chung "Ban biên tập", không nêu chức danh người xử lý
        if (editor != null && (decision == Decision.REQUEST_EDIT || decision == Decision.REJECT)) {
            String result = decision == Decision.REQUEST_EDIT
                    ? "<b>yêu cầu chỉnh sửa</b> " + label + ". Nội dung cần sửa:"
                    : "<b>không duyệt</b> " + label + ". Lý do:";
            mail(editor, "[Tin Nóng Dân Sinh] Ý kiến của Ban biên tập", "Ban biên tập " + result + "</p>" + noteHtml + "<p>");
        }
    }

    /**
     * Báo Chuyên gia khi bài KHÔNG được duyệt. Chuyên gia chỉ biết "đã được duyệt" (email lúc BTV duyệt) hoặc
     * "không được duyệt", không biết các bước nội bộ phía sau -> lúc Ban biên tập duyệt / chuyển tiếp không gửi gì.
     * Ghi chú nội bộ không gửi kèm.
     */
    private void notifyAuthor(ResearchArticle article, Decision decision) {
        if (decision != Decision.REJECT) {
            return;
        }
        mail(article.getAuthor(), "[Tin Nóng Dân Sinh] Kết quả duyệt bài nghiên cứu",
                "Rất tiếc, bài nghiên cứu <b>\"%s\"</b> của bạn <b>không được duyệt</b>."
                        .formatted(MailService.escape(article.getTitle())));
    }

    private void mail(User recipient, String subject, String bodyHtml) {
        mailService.trySend(recipient.getEmail(), subject, MailService.layout(
                "<p>Xin chào <b>%s</b>,</p><p>%s</p>".formatted(MailService.escape(recipient.getFullName()), bodyHtml)));
    }

    /** Hồ sơ cho bàn duyệt: Phó TBT chỉ mở / duyệt được hồ sơ thuộc chuyên mục mình (hoặc chưa có ai phụ trách). */
    private Submission findSubmissionFor(User user, String trackingCode) {
        Submission submission = findSubmission(trackingCode);
        User deputy = submission.getCategory() == null ? null : submission.getCategory().getDeputyEic();
        if (user.getRole() == User.Role.DEPUTY_EIC && deputy != null && !deputy.getId().equals(user.getId())) {
            throw AppException.forbidden("Hồ sơ thuộc chuyên mục bạn không phụ trách.", ErrorCode.FORBIDDEN);
        }
        return submission;
    }

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .filter(found -> found.getType() != Submission.SubmissionType.CONTRIBUTOR_POST)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    private ResearchArticle findResearch(Long articleId) {
        return researchArticleRepository.findById(articleId)
                .filter(found -> found.getStatus() == ResearchArticle.Status.SUBMITTED)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy bài nghiên cứu."));
    }

    /** Bài nghiên cứu Phó TBT được xem / duyệt: lĩnh vực của bài phải thuộc chuyên mục người này phụ trách (TBT xem hết). */
    private ResearchArticle findResearchFor(User user, Long articleId) {
        ResearchArticle article = findResearch(articleId);
        if (user.getRole() == User.Role.DEPUTY_EIC
                && (article.getField() == null || !repository.isDeputyOfField(article.getField(), user.getId()))) {
            throw AppException.forbidden("Bài thuộc lĩnh vực bạn không phụ trách.", ErrorCode.FORBIDDEN);
        }
        return article;
    }

    /** BTV đã duyệt bài nghiên cứu lần gần nhất (người nhận ý kiến của Ban biên tập). */
    private User lastApprovingEditor(ResearchArticle article) {
        List<EditoralReview> rows = repository.findByResearchArticleIdOrderByIdAsc(article.getId());
        User editor = null;
        for (EditoralReview row : rows) {
            if (row.getReviewRole() == ReviewRole.EDITOR && row.getAction() == ReviewAction.APPROVE) {
                editor = row.getReviewer();
            }
        }
        return editor;
    }

    private SubmissionReview toReview(User user, Submission submission) {
        // Kết quả xác minh dùng lại dữ liệu màn "Duyệt kết quả xác minh" của BTV (chỉ đọc)
        VerificationReviewResponse context = verificationReviewService.getContext(submission.getTrackingCode());
        Verification verification = context.assignment() == null ? null
                : new Verification(context.assignment(), context.report());
        return new SubmissionReview(trackingService.getForStaff(submission.getTrackingCode()),
                submission.getCategory() == null ? null : submission.getCategory().getName(),
                submission.getAssignedEditor() == null ? null : submission.getAssignedEditor().getFullName(),
                submission.getPriority(), verification,
                notesOf(repository.findBySubmissionIdOrderByIdAsc(submission.getId())),
                submission.getStatus() == WAITING_STATUS.get(user.getRole()));
    }

    private ResearchReview toReview(User user, ResearchArticle article) {
        SubmissionStatus waiting = WAITING_STATUS.get(user.getRole());
        return new ResearchReview(researchArticleService.getSubmittedForStaff(article.getId()),
                article.getAuthor().getFullName(), article.getReviewStatus(), article.getPriority(),
                notesOf(repository.findByResearchArticleIdOrderByIdAsc(article.getId())),
                waiting != null && article.getReviewStatus() != null && article.getReviewStatus().name().equals(waiting.name()));
    }

    /**
     * Đổi các dòng editorial_reviews thành ý kiến để hiển thị. Bỏ YÊU CẦU CHỈNH SỬA của BTV gửi Chuyên gia
     * (đã có khung "Lịch sử chỉnh sửa" riêng, nội dung là JSON phiên bản bài). Mã đánh dấu ở đầu ghi chú
     * (ví dụ "[VERIFICATION_REVIEW]") được bỏ đi cho dễ đọc.
     */
    private static List<Note> notesOf(List<EditoralReview> rows) {
        return rows.stream()
                .filter(row -> !(row.getReviewRole() == ReviewRole.EDITOR && row.getAction() == ReviewAction.REQUEST_EDIT
                        && row.getResearchArticle() != null))
                .map(row -> new Note(row.getReviewer() == null ? null : row.getReviewer().getFullName(), row.getReviewRole(),
                        row.getAction(), row.getComments() == null ? null : row.getComments().replaceFirst("^\\[[A-Z_]+]\\s*", ""),
                        row.getCreatedAt()))
                .toList();
    }

    /** Chỉ ý kiến của Ban biên tập, mới nhất trước (Java 17 chưa có List.reversed nên tự đảo). */
    private static List<Note> leadershipOnly(List<Note> notes) {
        // Cho BTV xem: chỉ những ý kiến BTV cần để xử lý (yêu cầu chỉnh sửa / không duyệt), ghi chung là "Ban biên tập"
        // — không lộ ai (Phó TBT hay Tổng biên tập) đã xử lý và các bước duyệt / chuyển tiếp nội bộ.
        List<Note> result = new ArrayList<>(notes.stream()
                .filter(note -> note.role() != ReviewRole.EDITOR)
                .filter(note -> note.action() == ReviewAction.REQUEST_EDIT || note.action() == ReviewAction.REJECT)
                .map(note -> new Note("Ban biên tập", null, note.action(), note.comments(), note.createdAt()))
                .toList());
        Collections.reverse(result);
        return result;
    }

    private static QueueItem queueItemOf(Submission submission) {
        return new QueueItem(Kind.SUBMISSION, submission.getTrackingCode(), null, submission.getTitle(),
                submission.getReportCategory() == null ? null : submission.getReportCategory().name(),
                submission.getCategory() == null ? null : submission.getCategory().getName(),
                submission.getAssignedEditor() == null ? null : submission.getAssignedEditor().getFullName(),
                submission.getPriority() == null ? null : submission.getPriority().name(),
                submission.getStatus().name(), submission.getUpdatedAt());
    }

    private QueueItem queueItemOf(ResearchArticle article) {
        User editor = lastApprovingEditor(article);
        return new QueueItem(Kind.RESEARCH, "NC-" + article.getId(), article.getId(), article.getTitle(), "RESEARCH",
                article.getField(), editor == null ? null : editor.getFullName(),
                article.getPriority() == null ? null : article.getPriority().name(),
                article.getReviewStatus().name(), article.getUpdatedAt());
    }
}
