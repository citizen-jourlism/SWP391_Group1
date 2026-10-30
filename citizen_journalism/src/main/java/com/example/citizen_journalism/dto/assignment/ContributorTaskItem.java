package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.Submission;
import java.time.LocalDateTime;

/** Một dòng trong danh sách "Nhiệm vụ của tôi" của Cộng tác viên. */
public record ContributorTaskItem(
        Long id,
        String trackingCode,
        String title,
        Submission.ReportCategory category,
        String province,
        FieldAssignment.AssignmentStatus status,
        FieldAssignment.CancelType cancelType,
        LocalDateTime deadline,
        LocalDateTime createdAt) {

    public static ContributorTaskItem from(FieldAssignment task) {
        Submission submission = task.getSubmission();
        return new ContributorTaskItem(
                task.getId(),
                submission.getTrackingCode(),
                submission.getTitle(),
                submission.getReportCategory(),
                submission.getProvince(),
                task.getStatus(),
                task.getCancelType(),
                task.getDeadline(),
                task.getCreatedAt());
    }
}
