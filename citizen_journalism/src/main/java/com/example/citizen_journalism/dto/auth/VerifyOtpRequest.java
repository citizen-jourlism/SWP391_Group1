package com.example.citizen_journalism.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Dữ liệu gửi lên khi nhập mã OTP: POST /api/auth/verify-otp
 * Cần email để biết đang xác thực tài khoản nào, và mã otp gồm đúng 6 chữ số.
 */
public record VerifyOtpRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        String email,

        @NotBlank(message = "Vui lòng nhập mã OTP.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã OTP gồm đúng 6 chữ số.") // \d{6} = đúng 6 chữ số
        String otp
) {
}
