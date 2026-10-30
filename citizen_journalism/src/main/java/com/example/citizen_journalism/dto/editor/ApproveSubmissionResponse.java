package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import java.time.LocalDateTime;

/**
 * Dữ liệu chức năng DUYỆT TIN NÓNG của Biên tập viên (GET /api/editor/submissions/{mã}/approval,
 * cũng là kết quả trả về của POST .../approve).
 *
 * @param submission    chi tiết hồ sơ
 * @param approvable    true khi hồ sơ là tin nóng và đang ở trạng thái Đang thẩm định (IN_REVIEW) nên duyệt được
 * @param blockedReason lý do không duyệt được (để frontend hiện cho Biên tập viên); null khi approvable = true
 * @param deputyName    Phó Tổng biên tập phụ trách lĩnh vực của hồ sơ (categories.deputy_eic_id);
 *                      null khi hồ sơ chưa gắn lĩnh vực hoặc lĩnh vực chưa có người phụ trách
 * @param approval      lần Biên tập viên duyệt gần nhất; null nếu hồ sơ chưa được duyệt
 */
public record ApproveSubmissionResponse(
        SubmissionDetail submission,
        boolean approvable,
        String blockedReason,
        String deputyName,
        Approval approval) {

    /**
     * @param approvedAt   thời điểm duyệt
     * @param reviewerName Biên tập viên đã duyệt
     * @param note         ghi chú nội bộ gửi Phó Tổng biên tập (editorial_reviews.comments)
     */
    public record Approval(LocalDateTime approvedAt, String reviewerName, String note) {
    }
}
