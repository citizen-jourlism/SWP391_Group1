package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.editor.AssessImpactRequest.Area;
import com.example.citizen_journalism.dto.editor.AssessImpactRequest.Nature;
import com.example.citizen_journalism.dto.editor.AssessImpactRequest.People;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.Submission.Priority;
import java.time.LocalDateTime;

/**
 * Dữ liệu màn ĐÁNH GIÁ MỨC TÁC ĐỘNG (GET /api/editor/submissions/{mã}/impact, cũng là kết quả của POST).
 * KHÔNG trả về điểm số: màn hình chỉ hiện mức độ (người dùng quyết định ẩn điểm, 2026-11-03).
 *
 * @param submission    chi tiết hồ sơ
 * @param assessable    true khi hồ sơ đang thẩm định (IN_REVIEW) nên đánh giá / đánh giá lại được
 * @param blockedReason lý do không đánh giá được; null khi assessable = true
 * @param deputyName    Phó Tổng biên tập phụ trách lĩnh vực của hồ sơ; null khi chưa có
 * @param assessment    lần đánh giá gần nhất; null nếu chưa đánh giá
 */
public record AssessImpactResponse(
        SubmissionDetail submission,
        boolean assessable,
        String blockedReason,
        String deputyName,
        Assessment assessment) {

    /**
     * @param priority       mức độ hệ thống xếp (submissions.priority)
     * @param raised         true khi mức được nâng lên HIGH vì đe doạ tính mạng / nội dung nhạy cảm
     * @param escalateToEic  true (HIGH / BREAKING) = Phó TBT chuyển tiếp, Tổng biên tập duyệt chốt;
     *                       false (LOW / MEDIUM) = Phó TBT duyệt chốt
     * @param assessedAt     thời điểm đánh giá
     * @param editorName     Biên tập viên đã đánh giá
     */
    public record Assessment(
            Area area,
            People people,
            Nature nature,
            boolean sensitive,
            String sensitiveReason,
            String note,
            Priority priority,
            boolean raised,
            boolean escalateToEic,
            LocalDateTime assessedAt,
            String editorName) {
    }
}
