package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.RejectionInfo;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.User;

/**
 * RESPONSE của màn TỪ CHỐI HỒ SƠ (Biên tập viên): dữ liệu backend trả về (GET /api/editor/submissions/{mã}/rejection,
 * và POST .../reject). Dữ liệu gửi lên khi từ chối là RejectSubmissionRequest.
 *
 * @param submission    chi tiết hồ sơ (kèm rejection đầy đủ nếu đã bị từ chối)
 * @param reporter      người gửi; null khi gửi ẩn danh (BTV không thấy danh tính, không trừ điểm được)
 * @param screening     kết quả sàng lọc AI đang có trong DB
 * @param rejectable    hồ sơ còn ở bước biên tập (Chờ xử lý / Đang xem xét / Cần bổ sung) nên còn từ chối được
 * @param penaltyPoints số điểm uy tín bị trừ nếu từ chối vì tin rác
 * @param review        lần từ chối đã lưu; null nếu chưa bị từ chối
 */
public record RejectSubmissionResponse(
        SubmissionDetail submission,
        Reporter reporter,
        Screening screening,
        boolean rejectable,
        int penaltyPoints,
        RejectionInfo review) {

    /**
     * @param email         email liên hệ đã che bớt, ví dụ "ng***@gmail.com"
     * @param rejectedCount số hồ sơ KHÁC của người này đã bị từ chối
     */
    public record Reporter(String fullName, User.Role role, Integer reputationScore, String email, long rejectedCount) {
    }

    /**
     * Sàng lọc AI. DB hiện chỉ có is_spam và ai_summary; spamScore / credibilityScore để null (frontend hiện "–")
     * cho tới khi có chức năng chấm điểm AI.
     *
     * @param suggestedReason lý do gợi ý sẵn trên form (SPAM khi AI đánh dấu tin rác)
     * @param aiReason        câu giải thích cho gợi ý
     */
    public record Screening(boolean isSpam, String aiSummary, Integer spamScore, Integer credibilityScore,
                            RejectReason suggestedReason, String aiReason) {
    }
}
