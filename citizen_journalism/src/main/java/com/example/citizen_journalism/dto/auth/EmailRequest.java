package com.example.citizen_journalism.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request chỉ chứa email. Dùng chung cho mọi API chỉ cần email:
 * gửi lại OTP (đang dùng), quên mật khẩu (sau này)...
 */
public record EmailRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        String email
) {
}
