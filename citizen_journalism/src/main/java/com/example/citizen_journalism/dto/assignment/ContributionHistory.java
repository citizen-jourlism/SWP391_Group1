package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.FieldReportFeedback.ReviewStatus;
import com.example.citizen_journalism.entity.Submission;
import java.time.LocalDateTime;

/**
 * Dữ liệu trang LỊCH SỬ ĐÓNG GÓP của Cộng tác viên (GET /api/contributor/tasks/history).
 * Đóng góp = báo cáo hiện trường đã nộp kèm bài viết. Nhiệm vụ bị từ chối / huỷ không tính, xem ở "Nhiệm vụ của tôi".
 *
 * Trả chung số liệu và danh sách trong 1 lần gọi vì trang lúc nào cũng cần cả 2.
 *
 * @param summary số liệu tổng hợp trên toàn bộ báo cáo, không phụ thuộc trang đang xem
 * @param reports các báo cáo đã nộp, mới nhất trước
 */
public record ContributionHistory(Summary summary, PageResponse<Item> reports) {

    /** @param approvedReports số báo cáo Biên tập viên đã duyệt */
    public record Summary(int performanceScore, long totalReports, long onTimeReports, long lateReports,
                          long approvedReports) {
    }

    /**
     * Một báo cáo đã nộp.
     *
     * @param taskId           mở chi tiết nhiệm vụ ở /contributor/tasks/{taskId}
     * @param submissionStatus hồ sơ gốc đang ở bước nào, để CTV biết tin mình xác minh đã đi tới đâu
     * @param submittedAt      lúc nộp báo cáo; sửa bài sau đó không đổi mốc này
     * @param pointsChange     số điểm hiệu suất nhận được khi nộp (âm nếu trễ hạn)
     */
    public record Item(
            Long taskId,
            String trackingCode,
            String submissionTitle,
            Submission.ReportCategory category,
            String articleTitle,
            FieldReport.Conclusion conclusion,
            ReviewStatus reviewStatus,
            Submission.SubmissionStatus submissionStatus,
            LocalDateTime deadline,
            LocalDateTime submittedAt,
            boolean onTime,
            int pointsChange) {

        public static Item from(FieldReport report, ReviewStatus reviewStatus, boolean onTime, int pointsChange) {
            FieldAssignment task = report.getAssignment();
            Submission submission = task.getSubmission();
            return new Item(
                    task.getId(),
                    submission.getTrackingCode(),
                    submission.getTitle(),
                    submission.getReportCategory(),
                    task.getOutputSubmission().getTitle(),
                    report.getConclusion(),
                    reviewStatus,
                    submission.getStatus(),
                    task.getDeadline(),
                    report.getCreatedAt(),
                    onTime,
                    pointsChange);
        }
    }
}
