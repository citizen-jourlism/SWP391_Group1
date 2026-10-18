package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.util.StrongPassword;
import com.example.citizen_journalism.util.ValidationRules;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Admin TẠO TÀI KHOẢN cho người khác (ví dụ Biên tập viên, Phó Tổng biên tập...): POST /api/admin/users
 * Tài khoản tạo xong dùng được ngay (ACTIVE), không cần OTP. Admin đặt mật khẩu ban đầu và báo cho người đó;
 * người đó nên tự đổi mật khẩu sau khi đăng nhập lần đầu.
 * Không được chọn vai trò SYSTEM_ADMIN (AdminService kiểm tra).
 * username: KHÔNG bắt buộc. Có thì người đó đăng nhập được bằng tên này thay cho email (ví dụ "testeditor").
 */
public record CreateUserRequest(
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

        // @Pattern bỏ qua null -> để trống (frontend gửi null) là hợp lệ
        @Pattern(regexp = ValidationRules.USERNAME_REGEX, message = ValidationRules.USERNAME_MESSAGE)
        String username,

        @NotNull(message = "Vui lòng chọn vai trò.")
        User.Role role,

        @StrongPassword
        String password
) {
}
