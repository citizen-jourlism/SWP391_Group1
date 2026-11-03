package com.example.citizen_journalism.dto.violation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAppealRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(max = 100) String password,
        @NotBlank @Size(min = 20, max = 3000) String reason,
        @Size(max = 2000) String evidenceNote) {
}
