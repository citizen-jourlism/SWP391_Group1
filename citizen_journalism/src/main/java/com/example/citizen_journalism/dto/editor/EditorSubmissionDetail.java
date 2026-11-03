package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.User;

public record EditorSubmissionDetail(
        SubmissionDetail detail,
        User.Role senderRole,
        boolean reputationReviewed) {
}
