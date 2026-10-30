package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.User;
import java.time.LocalDateTime;

/**
 * Dữ liệu màn YÊU CẦU BỔ SUNG THÔNG TIN của Biên tập viên (GET /api/editor/submissions/{mã}/info-request,
 * cũng là kết quả trả về của POST .../request-info).
 *
 * @param submission  chi tiết hồ sơ (có requestNote khi đang "Cần bổ sung")
 * @param reporter    người gửi; null khi gửi ẩn danh (BTV không thấy danh tính)
 * @param requestable hồ sơ đang Đã tiếp nhận / Đang thẩm định nên còn yêu cầu bổ sung được
 * @param request     yêu cầu đang chờ người gửi trả lời; null nếu hồ sơ không ở trạng thái "Cần bổ sung"
 */
public record InfoRequestResponse(
        SubmissionDetail submission,
        Reporter reporter,
        boolean requestable,
        PendingRequest request) {

    /** @param email email liên hệ đã che bớt, ví dụ "ng***@gmail.com" */
    public record Reporter(String fullName, User.Role role, Integer reputationScore, String email) {
    }

    /**
     * @param note         lời nhắn người gửi thấy (= ghi chú của bước nhật ký NEED_MORE_INFO), dạng "Lời nhắn\n1. ...\n2. ..."
     * @param requestedAt  thời điểm yêu cầu
     * @param reviewerName Biên tập viên đã yêu cầu (null nếu không tìm thấy bản ghi editorial_reviews)
     * @param internalNote ghi chú nội bộ (editorial_reviews.comments)
     */
    public record PendingRequest(String note, LocalDateTime requestedAt, String reviewerName, String internalNote) {
    }
}
