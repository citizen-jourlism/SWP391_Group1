package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.submission.CancelSubmissionRequest;
import com.example.citizen_journalism.dto.submission.CancelSubmissionRequest.CancelReason;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * HUỶ HỒ SƠ ĐANG CHỜ XỬ LÝ (Cancel Pending Submission) — người gửi (Người dân, Chuyên gia, Cộng tác viên) tự huỷ
 * hồ sơ của mình khi toà soạn chưa bắt đầu xử lý. API: SubmissionController (POST /api/submissions/mine/{mã}/cancel).
 * Frontend: components/submission/CancelSubmissionDialog.jsx (mở từ trang routes/MySubmissionDetail.jsx).
 *
 * ĐIỀU KIỆN:
 *   - Đúng chủ hồ sơ và đã đăng nhập (người khác -> "Không tìm thấy hồ sơ"). Trang tra cứu bằng mã + PIN chỉ xem.
 *   - Hồ sơ đang PENDING. Biên tập viên đã tiếp nhận (IN_REVIEW...) hoặc hồ sơ đã kết thúc -> 409, không huỷ được.
 *   - Lý do "Chuyển thành bài phân tích chuyên môn" chỉ dành cho Chuyên gia; "Lý do khác" phải có ghi chú.
 *
 * KHÔNG cần thêm cột / bảng mới. Khi huỷ, ghi:
 *   - submissions.status = CANCELLED + 1 bước nhật ký (SubmissionEventService.record):
 *       actor REPORTER, description "Người gửi đã huỷ hồ sơ: <tên lý do>.", note = ghi chú (có thể null)
 * Không trừ điểm uy tín, không xoá tệp tư liệu (toà soạn vẫn xem lại được nếu cần).
 */
@Service
@RequiredArgsConstructor
public class SubmissionCancelService {

    public static final String EVENT_PREFIX = "Người gửi đã huỷ hồ sơ: ";

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;

    /**
     * @return chi tiết hồ sơ SAU khi huỷ (trạng thái "Đã huỷ" + bước nhật ký mới), để frontend hiển thị ngay
     */
    @Transactional
    public SubmissionDetail cancel(String userId, String trackingCode, CancelSubmissionRequest request) {
        User author = userRepository.getActiveById(userId);
        String code = trackingCode.trim().toUpperCase(Locale.ROOT);
        Submission submission = submissionRepository.findByTrackingCodeAndAuthorId(code, userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
        // Toà soạn đã bắt đầu xử lý (hoặc hồ sơ đã kết thúc) thì không huỷ được nữa
        if (submission.getStatus() != SubmissionStatus.PENDING) {
            throw AppException.conflict("Toà soạn đã bắt đầu xử lý hồ sơ này. Chỉ hồ sơ đang chờ xử lý mới huỷ được.");
        }

        CancelReason reason = request.reason();
        String note = blankToNull(request.note());
        if (reason.isExpertOnly() && author.getRole() != User.Role.EXPERT) {
            throw AppException.invalidFields(Map.of("reason", "Lý do này chỉ dành cho Chuyên gia."));
        }
        if (reason == CancelReason.OTHER && note == null) {
            throw AppException.invalidFields(Map.of("note", "Vui lòng ghi rõ lý do huỷ."));
        }

        eventService.record(submission, SubmissionStatus.CANCELLED, SubmissionEvent.Actor.REPORTER,
                EVENT_PREFIX + reason.getLabel() + ".", note);
        return trackingService.getMine(userId, code);
    }
}
