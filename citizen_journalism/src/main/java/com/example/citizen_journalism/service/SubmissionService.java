package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.submission.CreateSubmissionRequest;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.dto.submission.SubmissionFormOptions;
import com.example.citizen_journalism.dto.submission.SubmissionReceipt;
import com.example.citizen_journalism.entity.Evidence;
import com.example.citizen_journalism.entity.Evidence.FileType;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import com.example.citizen_journalism.util.VietnamProvinces;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

/**
 * Nghiệp vụ GỬI TIN / KHIẾU NẠI của người dân.
 * Được SubmissionController gọi; người gửi luôn lấy từ token đăng nhập.
 *
 * LUỒNG create():
 *   1. Kiểm tra những gì annotation trong DTO không làm được: thông tin liên hệ (bắt buộc khi KHÔNG ẩn danh),
 *      tỉnh/thành hợp lệ, số lượng + định dạng + dung lượng tệp. Có lỗi -> trả về lỗi theo từng ô, chưa lưu gì.
 *   2. Lưu bản ghi submissions (trạng thái PENDING = chờ Biên tập viên tiếp nhận), sinh mã hồ sơ + mã PIN.
 *   3. Lưu từng tệp vào uploads/evidences + bảng evidences (tên gốc, loại, dung lượng).
 *   4. Gửi email biên nhận (mã hồ sơ + PIN) rồi trả biên nhận cho frontend hiển thị.
 *
 * ẨN DANH: không lưu họ tên / SĐT / email / CMND trên hồ sơ; chỉ giữ author_id để Tổng biên tập có thể
 * giải mật khi có căn cứ (chức năng sau). Email biên nhận khi đó gửi về email TÀI KHOẢN của người gửi.
 */
@Service
@RequiredArgsConstructor
public class SubmissionService {

    private static final long MB = 1024L * 1024;

    /*
     * GIỚI HẠN TỆP TƯ LIỆU cho MỖI lần gửi: lần gửi hồ sơ (create) và mỗi lần bổ sung thông tin
     * (SubmissionSupplementService) đều tính riêng, không cộng dồn các tệp đã gửi trước đó.
     */

    /** Tổng số tệp tối đa (mọi loại cộng lại). */
    public static final int MAX_FILES = 10;

    /** Số tệp tối đa theo từng loại. */
    public static final Map<FileType, Integer> MAX_FILES_BY_TYPE = Map.of(
            FileType.IMAGE, 10,
            FileType.DOCUMENT, 5,
            FileType.AUDIO, 2,
            FileType.VIDEO, 2);

    /** Dung lượng tối đa MỖI tệp theo từng loại (byte). */
    public static final Map<FileType, Long> MAX_FILE_BYTES_BY_TYPE = Map.of(
            FileType.IMAGE, 20 * MB,
            FileType.DOCUMENT, 50 * MB,
            FileType.AUDIO, 100 * MB,
            FileType.VIDEO, 300 * MB);

    /**
     * Tổng dung lượng tối đa của tất cả tệp (byte).
     * spring.servlet.multipart.max-request-size để lớn hơn một chút (chừa chỗ cho phần "data")
     * để lỗi vượt tổng do hàm này báo bằng tiếng Việt, không bị Spring chặn trước.
     */
    public static final long MAX_TOTAL_BYTES = 300 * MB;

    private static final String EVIDENCE_FOLDER = "evidences";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SubmissionRepository submissionRepository;
    private final EvidenceRepository evidenceRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final SubmissionEventService submissionEventService;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    /** Tuỳ chọn cho form (loại phản ánh được phép theo vai trò, danh sách tỉnh, giới hạn tệp). Xem SubmissionFormOptions. */
    @Transactional(readOnly = true)
    public SubmissionFormOptions getFormOptions(String userId) {
        User user = userRepository.getActiveById(userId);
        return new SubmissionFormOptions(
                Submission.ReportCategory.allowedFor(user.getRole()),
                VietnamProvinces.ALL,
                MAX_FILES,
                new EnumMap<>(MAX_FILES_BY_TYPE), // EnumMap: giữ thứ tự IMAGE, VIDEO, AUDIO, DOCUMENT khi trả JSON
                toMegabytes(MAX_FILE_BYTES_BY_TYPE),
                MAX_TOTAL_BYTES / MB,
                FileStorageService.EVIDENCE_TYPES.keySet().stream().sorted().toList());
    }

    @Transactional
    public SubmissionReceipt create(String userId, CreateSubmissionRequest request, List<MultipartFile> files) {
        User author = userRepository.getActiveById(userId);
        List<MultipartFile> evidenceFiles = files == null ? List.of() : files;

        // ----- 1. Kiểm tra -----
        validate(author, request, evidenceFiles);
        boolean anonymous = request.anonymous();

        // ----- 2. Lưu hồ sơ -----
        String pin = String.format("%06d", RANDOM.nextInt(1_000_000)); // 6 chữ số, giữ số 0 ở đầu
        Submission submission = submissionRepository.save(Submission.builder()
                .type(request.category().getSubmissionType())
                .reportCategory(request.category())
                .author(author)
                .title(request.title().trim())
                .summary(request.summary().trim())
                .content(request.content().trim())
                .incidentAt(request.incidentAt())
                .province(request.province())
                .address(request.address().trim())
                .isAnonymous(anonymous)
                // Ẩn danh -> không lưu thông tin liên hệ (để null)
                .contactName(anonymous ? null : request.fullName().trim())
                .contactPhone(anonymous ? null : request.phone().trim())
                .contactEmail(anonymous ? null : TextUtils.normalizeEmail(request.email()))
                .contactCitizenId(anonymous ? null : blankToNull(request.citizenId()))
                .reporterRelationship(request.relationship())
                .pinHash(passwordEncoder.encode(pin)) // Chỉ lưu bản băm, giống mật khẩu
                .status(Submission.SubmissionStatus.PENDING)
                .build());
        // Mã hồ sơ cần id (chỉ có sau khi lưu), ví dụ id 7 năm 2026 -> "KB-2026-0007".
        // Không cần save() lại: submission đang được JPA quản lý, tự ghi xuống DB khi kết thúc transaction.
        submission.setTrackingCode("KB-%d-%04d".formatted(submission.getCreatedAt().getYear(), submission.getId()));
        // Bước 1 của nhật ký xử lý (người gửi xem được khi tra cứu)
        submissionEventService.record(submission, Submission.SubmissionStatus.PENDING, SubmissionEvent.Actor.REPORTER,
                "Gửi hồ sơ thành công, toà soạn đã tiếp nhận.", null);

        // ----- 3. Lưu tệp tư liệu -----
        List<EvidenceInfo> evidences = attachEvidences(submission, author, evidenceFiles);

        // ----- 4. Gửi email biên nhận -----
        String recipient = anonymous ? author.getEmail() : submission.getContactEmail();
        String notifiedEmail = sendReceipt(recipient, submission, pin) ? recipient : null;

        return new SubmissionReceipt(
                submission.getId(),
                submission.getTrackingCode(),
                pin,
                submission.getReportCategory(),
                submission.getTitle(),
                submission.getStatus(),
                anonymous,
                submission.getCreatedAt(),
                notifiedEmail,
                !mailService.isLiveDelivery(),
                evidences);
    }

    /**
     * Lưu các tệp tư liệu của 1 hồ sơ (ghi file + bảng evidences). Gọi TRONG transaction của hàm gọi.
     * Dùng ở: create() và SubmissionSupplementService (tệp bổ sung khi toà soạn đề nghị).
     * Tệp phải đã qua validateEvidenceFiles.
     */
    public List<EvidenceInfo> attachEvidences(Submission submission, User uploader, List<MultipartFile> files) {
        List<String> storedUrls = new ArrayList<>();
        try {
            return files.stream().map(file -> saveEvidence(submission, uploader, file, storedUrls)).toList();
        } catch (RuntimeException ex) {
            // Lỗi giữa chừng: DB tự huỷ (rollback) nhờ @Transactional, còn file đã ghi ra ổ đĩa thì phải tự xoá.
            storedUrls.forEach(fileStorageService::delete);
            throw ex;
        }
    }

    /**
     * Kiểm tra số lượng, định dạng, dung lượng các tệp (KHÔNG bắt buộc có tệp). Lỗi ghi vào errors với khoá "files".
     * Dùng ở: validate() của create() và SubmissionSupplementService.
     * Thứ tự: tổng số tệp -> từng tệp (định dạng, dung lượng theo loại) -> số tệp theo loại -> tổng dung lượng.
     */
    public void validateEvidenceFiles(List<MultipartFile> files, Map<String, String> errors) {
        if (files.size() > MAX_FILES) {
            errors.put("files", "Chỉ được đính kèm tối đa " + MAX_FILES + " tệp.");
            return;
        }
        Map<FileType, Integer> counts = new EnumMap<>(FileType.class);
        long totalBytes = 0;
        // Kiểm tra TẤT CẢ tệp trước khi lưu bất kỳ tệp nào
        try {
            for (MultipartFile file : files) {
                // Lần 1: có nội dung + đúng định dạng (chưa xét dung lượng) -> mới biết tệp thuộc loại nào
                fileStorageService.validate(file, FileStorageService.EVIDENCE_TYPES, Long.MAX_VALUE);
                FileType type = fileTypeOf(file.getContentType());
                // Lần 2: dung lượng theo giới hạn của đúng loại đó
                fileStorageService.validate(file, FileStorageService.EVIDENCE_TYPES, MAX_FILE_BYTES_BY_TYPE.get(type));
                counts.merge(type, 1, Integer::sum);
                totalBytes += file.getSize();
            }
        } catch (AppException ex) {
            errors.put("files", ex.getMessage());
            return;
        }
        for (Map.Entry<FileType, Integer> entry : counts.entrySet()) {
            int max = MAX_FILES_BY_TYPE.get(entry.getKey());
            if (entry.getValue() > max) {
                errors.put("files", "Chỉ được đính kèm tối đa " + max + " tệp " + labelOf(entry.getKey()) + ".");
                return;
            }
        }
        if (totalBytes > MAX_TOTAL_BYTES) {
            errors.put("files", "Tổng dung lượng các tệp vượt quá " + (MAX_TOTAL_BYTES / MB) + "MB.");
        }
    }

    // ================================ HÀM PHỤ ================================

    /**
     * Gom MỌI lỗi theo từng ô rồi ném 1 lần (người dùng thấy hết lỗi cùng lúc, không phải sửa từng cái).
     * Tên khoá trong map trùng tên ô ở frontend để lỗi hiện đúng chỗ.
     */
    private void validate(User author, CreateSubmissionRequest request, List<MultipartFile> files) {
        Map<String, String> errors = new LinkedHashMap<>();

        // Loại phản ánh phải đúng vai trò (ví dụ người dân chỉ gửi Tin nóng / Khiếu nại) - xem ReportCategory
        if (!request.category().isAllowedFor(author.getRole())) {
            errors.put("category", "Tài khoản của bạn không gửi được loại phản ánh này.");
        }

        if (!VietnamProvinces.isValid(request.province())) {
            errors.put("province", "Tỉnh/thành phố không hợp lệ.");
        }

        // Không ẩn danh thì bắt buộc có đủ họ tên, SĐT, email (để toà soạn liên hệ, gửi mã PIN)
        if (!request.anonymous()) {
            if (blankToNull(request.fullName()) == null) {
                errors.put("fullName", "Vui lòng nhập họ và tên.");
            }
            if (blankToNull(request.phone()) == null) {
                errors.put("phone", "Vui lòng nhập số điện thoại.");
            }
            if (blankToNull(request.email()) == null) {
                errors.put("email", "Vui lòng nhập email.");
            }
        }

        if (files.isEmpty()) {
            errors.put("files", "Vui lòng đính kèm ít nhất 1 tệp tư liệu.");
        } else {
            validateEvidenceFiles(files, errors);
        }

        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }
    }

    /** Lưu 1 tệp: ghi file ra ổ đĩa rồi thêm 1 dòng vào bảng evidences. */
    private EvidenceInfo saveEvidence(Submission submission, User author, MultipartFile file, List<String> storedUrls) {
        FileType fileType = fileTypeOf(file.getContentType());

        // Tên file trên ổ đĩa bắt đầu bằng mã hồ sơ, ví dụ "KB-2026-0007-1a2b3c4d.jpg" (dễ tìm khi cần)
        String url = fileStorageService.store(file, EVIDENCE_FOLDER, submission.getTrackingCode(),
                FileStorageService.EVIDENCE_TYPES, MAX_FILE_BYTES_BY_TYPE.get(fileType));
        storedUrls.add(url);

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("originalName", FileStorageService.originalName(file, "tep-dinh-kem"));
        metadata.put("size", file.getSize());
        metadata.put("contentType", file.getContentType());

        Evidence evidence = evidenceRepository.save(Evidence.builder()
                .submission(submission)
                .uploadedBy(author)
                .fileUrl(url)
                .fileType(fileType)
                .metadata(objectMapper.writeValueAsString(metadata))
                .build());

        return EvidenceInfo.from(evidence, objectMapper); // Cùng cách đọc với màn hình chi tiết hồ sơ
    }

    /** Đổi giới hạn byte theo loại sang MB để trả cho frontend (EnumMap giữ thứ tự loại tệp). */
    private static Map<FileType, Long> toMegabytes(Map<FileType, Long> bytesByType) {
        Map<FileType, Long> result = new EnumMap<>(FileType.class);
        bytesByType.forEach((type, bytes) -> result.put(type, bytes / MB));
        return result;
    }

    /** Tên loại tệp trong thông báo lỗi, ví dụ "Chỉ được đính kèm tối đa 2 tệp video." */
    private static String labelOf(FileType type) {
        return switch (type) {
            case IMAGE -> "hình ảnh";
            case VIDEO -> "video";
            case AUDIO -> "ghi âm";
            case DOCUMENT -> "tài liệu";
        };
    }

    /** Phân loại tệp theo phần đầu của Content-Type: "image/jpeg" -> IMAGE, "audio/mpeg" -> AUDIO... */
    private static FileType fileTypeOf(String contentType) {
        if (contentType.startsWith("image/")) {
            return FileType.IMAGE;
        }
        if (contentType.startsWith("video/")) {
            return FileType.VIDEO;
        }
        if (contentType.startsWith("audio/")) {
            return FileType.AUDIO;
        }
        return FileType.DOCUMENT;
    }

    /**
     * Gửi email biên nhận. Trả về false nếu gửi lỗi.
     * TẠI SAO không báo lỗi cho người dùng? Hồ sơ đã lưu thành công; mã hồ sơ + PIN vẫn hiện trên màn hình,
     * nên lỗi email không được làm hỏng cả lần gửi (frontend sẽ nhắc người dùng tự lưu lại mã).
     */
    private boolean sendReceipt(String recipient, Submission submission, String pin) {
        return mailService.trySend(recipient, "[Tin Nóng Dân Sinh] Biên nhận hồ sơ " + submission.getTrackingCode(),
                buildReceiptEmail(submission, pin));
    }

    /** Nội dung email biên nhận. MailService.escape: tiêu đề do người dùng nhập, chặn chèn mã HTML vào email. */
    private String buildReceiptEmail(Submission submission, String pin) {
        return MailService.layout("""
                  <p>Toà soạn đã tiếp nhận phản ánh của bạn:</p>
                  <p style="padding:12px 16px;background:#f5f7fb;border-radius:8px"><b>%s</b></p>
                  <table style="margin:16px 0;font-size:15px">
                    <tr><td style="padding:4px 16px 4px 0;color:#7a8190">Mã hồ sơ</td>
                        <td style="font-weight:800;font-size:20px;letter-spacing:1px">%s</td></tr>
                    <tr><td style="padding:4px 16px 4px 0;color:#7a8190">Mã PIN</td>
                        <td style="font-weight:800;font-size:20px;letter-spacing:6px;color:#ff4500">%s</td></tr>
                  </table>
                  <p>Dùng <b>mã hồ sơ + mã PIN</b> để tra cứu tiến độ xử lý. Vui lòng giữ bí mật mã PIN.</p>
                  <p style="color:#7a8190;font-size:12px">Đây là email tự động, vui lòng không trả lời.</p>
                """.formatted(MailService.escape(submission.getTitle()), submission.getTrackingCode(), pin));
    }
}
