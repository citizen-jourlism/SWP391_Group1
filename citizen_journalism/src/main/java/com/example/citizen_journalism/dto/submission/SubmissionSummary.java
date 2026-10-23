package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;

/** Một dòng trong danh sách "Thông tin đã gửi" (GET /api/submissions/mine). Chỉ gồm thông tin ngắn gọn. */
public record SubmissionSummary(
        String trackingCode,
        ReportCategory category,
        String title,
        SubmissionStatus status,
        boolean anonymous,
        String province,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static SubmissionSummary from(Submission submission) {
        return new SubmissionSummary(
                submission.getTrackingCode(),
                submission.getReportCategory(),
                submission.getTitle(),
                submission.getStatus(),
                Boolean.TRUE.equals(submission.getIsAnonymous()),
                submission.getProvince(),
                submission.getCreatedAt(),
                submission.getUpdatedAt());
    }
}
