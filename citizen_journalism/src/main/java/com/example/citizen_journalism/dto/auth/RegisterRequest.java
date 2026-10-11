package com.example.citizen_journalism.dto.auth;

import com.example.citizen_journalism.util.ValidationRules;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO (Data Transfer Object) = "phiếu" chứa dữ liệu frontend gửi lên khi đăng ký.
 * Nhận từ: POST /api/auth/register (xem AuthController).
 *
 * TẠI SAO không nhận thẳng entity User?
 *   - Chỉ nhận đúng các trường cho phép. Người dùng không thể tự gửi kèm role = SYSTEM_ADMIN.
 *   - Gắn quy tắc kiểm tra riêng cho form này.
 *
 * Các annotation (@NotBlank, @Email...) được kiểm tra tự động nhờ @Valid ở controller.
 * Sai thì GlobalExceptionHandler trả về lỗi theo từng trường kèm "message" bên dưới.
 * Frontend cũng kiểm tra y hệt (Register.jsx) để báo lỗi ngay, còn backend kiểm tra lại cho chắc,
 * vì không bao giờ được tin dữ liệu từ phía trình duyệt.
 * Không có confirmPassword: việc "nhập lại mật khẩu" chỉ cần kiểm tra ở frontend.
 */
public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự.")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        @Size(max = 255, message = "Email tối đa 255 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @Pattern(regexp = ValidationRules.PHONE_REGEX, message = ValidationRules.PHONE_MESSAGE)
        String phone,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = 8, max = 64, message = "Mật khẩu phải từ 8 đến 64 ký tự.")
        @Pattern(regexp = ValidationRules.PASSWORD_REGEX, message = ValidationRules.PASSWORD_MESSAGE)
        String password
) {
}
