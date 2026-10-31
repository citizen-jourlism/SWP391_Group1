package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReportFeedback;
import com.example.citizen_journalism.entity.Submission;
import java.time.LocalDateTime;

/**
 * Một dòng trong danh sách "Nhiệm vụ của tôi" của Cộng tác viên.
 *
 * @param reviewStatus trạng thái xem xét báo cáo; null nếu nhiệm vụ chưa có báo cáo
 */
public record ContributorTaskItem(
        Long id,
        String trackingCode,
        String title,
        Submission.ReportCategory category,
        String province,
        FieldAssignment.AssignmentStatus status,
        FieldReportFeedback.ReviewStatus reviewStatus,
        FieldAssignment.CancelType cancelType,
        LocalDateTime deadline,
        LocalDateTime createdAt) {

    public static ContributorTaskItem from(FieldAssignment task, FieldReportFeedback.ReviewStatus reviewStatus) {
        Submission submission = task.getSubmission();
        return new ContributorTaskItem(
                task.getId(),
                submission.getTrackingCode(),
                submission.getTitle(),
                submission.getReportCategory(),
                submission.getProvince(),
                task.getStatus(),
                reviewStatus,
                task.getCancelType(),
                task.getDeadline(),
                task.getCreatedAt());
    }
}
