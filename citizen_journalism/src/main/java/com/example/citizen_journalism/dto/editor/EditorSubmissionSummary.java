package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;

/** Một hồ sơ trong hàng đợi biên tập viên; không tiết lộ tài khoản của hồ sơ gửi ẩn danh. */
public record EditorSubmissionSummary(
        String trackingCode,
        ReportCategory category,
        String title,
        SubmissionStatus status,
        boolean anonymous,
        String senderAccountId,
        String province,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static EditorSubmissionSummary from(Submission submission) {
        boolean anonymous = Boolean.TRUE.equals(submission.getIsAnonymous());
        return new EditorSubmissionSummary(
                submission.getTrackingCode(),
                submission.getReportCategory(),
                submission.getTitle(),
                submission.getStatus(),
                anonymous,
                anonymous ? null : submission.getAuthor().getId(),
                submission.getProvince(),
                submission.getCreatedAt(),
                submission.getUpdatedAt());
    }
}
