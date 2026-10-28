package com.example.citizen_journalism.dto.violation;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.UserViolation;
import com.example.citizen_journalism.entity.ReputationLog;
import java.time.LocalDateTime;
import java.util.List;

public record ViolationDetail(
        Long id,
        Account account,
        RelatedSubmission submission,
        UserViolation.Type type,
        UserViolation.Severity severity,
        String description,
        String evidenceNote,
        String retractionSnapshot,
        UserViolation.Status status,
        UserViolation.Action proposedAction,
        Integer pointsDeducted,
        Staff reporter,
        Staff reviewer,
        String reviewNote,
        LocalDateTime reviewedAt,
        Staff approver,
        String approvalNote,
        LocalDateTime approvedAt,
        LocalDateTime createdAt,
        List<ReputationEntry> reputationHistory) {

    public record Account(String id, String fullName, String email, User.Role role, User.Status status,
                          Integer reputationScore, String avatarUrl) {
    }

    public record RelatedSubmission(String trackingCode, String title, String status) {
    }

    public record Staff(String id, String fullName) {
    }

    public record ReputationEntry(Integer pointsChange, ReputationLog.ReputationReason reason,
                                  String trackingCode, String submissionTitle, LocalDateTime createdAt) {
    }

    public static ViolationDetail from(UserViolation violation) {
        return from(violation, List.of());
    }

    public static ViolationDetail from(UserViolation violation, List<ReputationLog> history) {
        User user = violation.getReportedUser();
        return new ViolationDetail(
                violation.getId(),
                new Account(user.getId(), user.getFullName(), user.getEmail(), user.getRole(), user.getStatus(),
                        user.getReputationScore(), user.getAvatarUrl()),
                violation.getRelatedSubmission() == null ? null : new RelatedSubmission(
                        violation.getRelatedSubmission().getTrackingCode(), violation.getRelatedSubmission().getTitle(),
                        violation.getRelatedSubmission().getStatus().name()),
                violation.getType(), violation.getSeverity(), violation.getDescription(), violation.getEvidenceNote(),
                violation.getRetractionSnapshot(),
                violation.getStatus(), violation.getProposedAction(), violation.getPointsDeducted(),
                staff(violation.getReportedBy()), staff(violation.getReviewedBy()), violation.getReviewNote(),
                violation.getReviewedAt(), staff(violation.getApprovedBy()), violation.getApprovalNote(),
                violation.getApprovedAt(), violation.getCreatedAt(), history.stream().map(log ->
                        new ReputationEntry(log.getPointsChange(), log.getReason(),
                                log.getRelatedSubmission() == null ? null : log.getRelatedSubmission().getTrackingCode(),
                                log.getRelatedSubmission() == null ? null : log.getRelatedSubmission().getTitle(),
                                log.getCreatedAt())).toList());
    }

    private static Staff staff(User user) {
        return user == null ? null : new Staff(user.getId(), user.getFullName());
    }
}
