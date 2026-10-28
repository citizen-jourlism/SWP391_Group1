package com.example.citizen_journalism.dto.violation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AppealStatusRequest(
        @NotNull @Positive Long appealId,
        @NotBlank @Email String email,
        @NotBlank String password) {
}
