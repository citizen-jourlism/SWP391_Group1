package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewSubmissionRequest(
        @NotNull Decision decision,
        @Size(max = 2000) String reason) {

    public enum Decision {
        APPROVE,
        FAKE_NEWS
    }
}
