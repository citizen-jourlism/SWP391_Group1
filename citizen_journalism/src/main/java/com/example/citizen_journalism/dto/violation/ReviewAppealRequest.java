package com.example.citizen_journalism.dto.violation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewAppealRequest(
        @NotNull Decision decision,
        @Size(max = 2000) String note) {

    public enum Decision {
        FORWARD,
        REJECT
    }
}
