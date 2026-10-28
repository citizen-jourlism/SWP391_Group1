package com.example.citizen_journalism.dto.violation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ApproveViolationRequest(
        @NotNull(message = "Vui lòng chọn quyết định.") Decision decision,
        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự.") String note) {

    public enum Decision {
        APPROVE,
        REJECT
    }
}
