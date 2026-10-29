package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;

public record ReputationSubmissionItem(
        String trackingCode,
        String title,
        Submission.ReportCategory category,
        SubmissionStatus status,
        LocalDateTime createdAt,
        boolean reputationReviewed) {

    public static ReputationSubmissionItem from(Submission submission, boolean reputationReviewed) {
        return new ReputationSubmissionItem(submission.getTrackingCode(), submission.getTitle(),
                submission.getReportCategory(), submission.getStatus(), submission.getCreatedAt(), reputationReviewed);
    }
}
