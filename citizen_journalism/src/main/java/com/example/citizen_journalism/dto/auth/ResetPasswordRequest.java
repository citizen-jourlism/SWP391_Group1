package com.example.citizen_journalism.dto.auth;

import com.example.citizen_journalism.util.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Dữ liệu gửi lên ở bước 2 của "Quên mật khẩu": POST /api/auth/reset-password
 * Gồm email, mã OTP nhận qua email và mật khẩu mới (gửi cùng lúc trong 1 request).
 */
public record ResetPasswordRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        String email,

        @NotBlank(message = "Vui lòng nhập mã OTP.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã OTP gồm đúng 6 chữ số.")
        String otp,

        @StrongPassword
        String newPassword
) {
}
