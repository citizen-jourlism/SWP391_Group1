package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.User;

public record ReputationReviewResult<T>(
        T article,
        int pointsChange,
        Integer reputationScore,
        User.Status accountStatus) {
}
