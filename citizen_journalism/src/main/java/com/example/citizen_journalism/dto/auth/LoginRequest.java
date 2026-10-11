package com.example.citizen_journalism.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Dữ liệu gửi lên khi đăng nhập: POST /api/auth/login
 *
 * - rememberMe: tick "Ghi nhớ đăng nhập" thì token sống lâu hơn (7 ngày thay vì 24 giờ, xem JwtService).
 *   Dùng Boolean (có thể null) thay vì boolean: Jackson 3 báo lỗi nếu trường kiểu nguyên thuỷ bị thiếu,
 *   mà frontend có thể không gửi trường này. Thiếu/null được hiểu là false (xem isRememberMe()).
 * Không kiểm tra độ mạnh mật khẩu ở đây, chỉ cần không trống (quy tắc mật khẩu áp dụng lúc đăng ký/đổi mật khẩu).
 */
public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        String password,

        Boolean rememberMe
) {

    /** true chỉ khi frontend gửi rememberMe = true. */
    public boolean isRememberMe() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
