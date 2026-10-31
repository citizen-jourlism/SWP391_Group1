package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReportFeedback;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import java.time.LocalDateTime;

/**
 * Một nhiệm vụ xác minh hiện trường, hiển thị ở bàn Biên tập viên. Không chứa thông tin liên hệ của người gửi.
 *
 * @param reviewStatus trạng thái xem xét báo cáo; null nếu nhiệm vụ chưa có báo cáo
 */
public record AssignmentView(
        Long id,
        String trackingCode,
        String submissionTitle,
        Submission.SubmissionStatus submissionStatus,
        Submission.ReportCategory category,
        String province,
        String address,
        String contributorId,
        String contributorName,
        String contributorAvatarUrl,
        int contributorScore,
        FieldAssignment.AssignmentStatus status,
        FieldReportFeedback.ReviewStatus reviewStatus,
        FieldAssignment.CancelType cancelType,
        String cancelReason,
        LocalDateTime deadline,
        String note,
        LocalDateTime claimedAt,
        LocalDateTime createdAt) {

    public static AssignmentView from(FieldAssignment assignment) {
        return from(assignment, null);
    }

    public static AssignmentView from(FieldAssignment assignment, FieldReportFeedback.ReviewStatus reviewStatus) {
        Submission submission = assignment.getSubmission();
        User contributor = assignment.getContributor();
        return new AssignmentView(
                assignment.getId(),
                submission.getTrackingCode(),
                submission.getTitle(),
                submission.getStatus(),
                submission.getReportCategory(),
                submission.getProvince(),
                submission.getAddress(),
                contributor.getId(),
                contributor.getFullName(),
                contributor.getAvatarUrl(),
                contributor.performanceScoreOrDefault(),
                assignment.getStatus(),
                reviewStatus,
                assignment.getCancelType(),
                assignment.getCancelReason(),
                assignment.getDeadline(),
                assignment.getNote(),
                assignment.getClaimedAt(),
                assignment.getCreatedAt());
    }
}
