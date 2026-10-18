package com.example.citizen_journalism.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request chỉ chứa mã OTP 6 số, dùng khi người dùng ĐÃ đăng nhập (biết là ai qua token,
 * không cần gửi kèm email). Đang dùng ở: xác nhận đổi email (POST /api/users/me/email/verify).
 */
public record OtpCodeRequest(
        @NotBlank(message = "Vui lòng nhập mã OTP.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã OTP gồm đúng 6 chữ số.")
        String otp
) {
}
