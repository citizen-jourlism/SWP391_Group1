package com.example.citizen_journalism.dto.violation;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.UserViolation;
import java.time.LocalDateTime;

public record ViolationSummary(
        Long id,
        String userId,
        String userName,
        String userEmail,
        String avatarUrl,
        User.Role userRole,
        User.Status userStatus,
        Integer reputationScore,
        UserViolation.Type type,
        UserViolation.Severity severity,
        UserViolation.Status status,
        UserViolation.Action proposedAction,
        String trackingCode,
        String submissionTitle,
        LocalDateTime createdAt) {

    public static ViolationSummary from(UserViolation violation) {
        User user = violation.getReportedUser();
        return new ViolationSummary(
                violation.getId(), user.getId(), user.getFullName(), user.getEmail(), user.getAvatarUrl(), user.getRole(),
                user.getStatus(), user.getReputationScore(), violation.getType(), violation.getSeverity(),
                violation.getStatus(), violation.getProposedAction(),
                violation.getRelatedSubmission() == null ? null : violation.getRelatedSubmission().getTrackingCode(),
                violation.getRelatedSubmission() == null ? null : violation.getRelatedSubmission().getTitle(),
                violation.getCreatedAt());
    }
}
