package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.User;

public record ReputationAccountSummary(
        String id,
        String fullName,
        String email,
        User.Role role,
        User.Status status,
        Integer reputationScore) {

    public static ReputationAccountSummary from(User user) {
        return new ReputationAccountSummary(user.getId(), user.getFullName(), user.getEmail(), user.getRole(),
                user.getStatus(), user.getReputationScore());
    }
}
