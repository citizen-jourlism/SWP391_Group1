package com.example.citizen_journalism.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu gửi lên khi đăng nhập: POST /api/auth/login
 *
 * - identifier: EMAIL hoặc TÊN ĐĂNG NHẬP. Người dùng thường dùng email; tài khoản quản trị dùng tên đăng nhập
 *   (ví dụ "Admin"). Có ký tự "@" thì hiểu là email, không có thì là tên đăng nhập (xem AuthService.login).
 * - rememberMe: tick "Ghi nhớ đăng nhập" thì token sống lâu hơn (7 ngày thay vì 24 giờ, xem JwtService).
 *   Dùng Boolean (có thể null) thay vì boolean: Jackson 3 báo lỗi nếu trường kiểu nguyên thuỷ bị thiếu,
 *   mà frontend có thể không gửi trường này. Thiếu/null được hiểu là false (xem isRememberMe()).
 * Không kiểm tra độ mạnh mật khẩu ở đây, chỉ cần không trống (quy tắc mật khẩu áp dụng lúc đăng ký/đổi mật khẩu).
 */
public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập email hoặc tên đăng nhập.")
        @Size(max = 255, message = "Email / tên đăng nhập quá dài.")
        String identifier,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        String password,

        Boolean rememberMe
) {

    /** true chỉ khi frontend gửi rememberMe = true. */
    public boolean isRememberMe() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
