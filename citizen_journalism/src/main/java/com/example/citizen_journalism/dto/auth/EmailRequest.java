package com.example.citizen_journalism.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Request chỉ chứa email (gửi lại OTP, quên mật khẩu...). */
public record EmailRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        String email
) {
}
