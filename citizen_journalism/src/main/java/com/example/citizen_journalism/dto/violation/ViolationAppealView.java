package com.example.citizen_journalism.dto.violation;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.ViolationAppeal;
import java.time.LocalDateTime;

public record ViolationAppealView(
        Long id,
        Account account,
        String reason,
        String evidenceNote,
        ViolationAppeal.Status status,
        Staff reviewer,
        String reviewNote,
        LocalDateTime reviewedAt,
        Staff decisionMaker,
        String decisionNote,
        LocalDateTime decidedAt,
        LocalDateTime createdAt) {

    public record Account(String id, String fullName, String email, User.Role role, User.Status status,
                          Integer reputationScore) {
    }

    public record Staff(String id, String fullName) {
    }

    public static ViolationAppealView from(ViolationAppeal appeal) {
        User user = appeal.getUser();
        return new ViolationAppealView(
                appeal.getId(),
                new Account(user.getId(), user.getFullName(), user.getEmail(), user.getRole(),
                        user.getStatus(), user.getReputationScore()),
                appeal.getReason(),
                appeal.getEvidenceNote(),
                appeal.getStatus(),
                staff(appeal.getReviewedBy()),
                appeal.getReviewNote(),
                appeal.getReviewedAt(),
                staff(appeal.getDecidedBy()),
                appeal.getDecisionNote(),
                appeal.getDecidedAt(),
                appeal.getCreatedAt());
    }

    private static Staff staff(User user) {
        return user == null ? null : new Staff(user.getId(), user.getFullName());
    }
}
