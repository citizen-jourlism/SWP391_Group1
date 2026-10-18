package com.example.citizen_journalism.dto.auth;

import com.example.citizen_journalism.util.StrongPassword;
import jakarta.validation.constraints.NotBlank;

/**
 * Dữ liệu gửi lên khi ĐỔI mật khẩu (đã đăng nhập): PUT /api/auth/change-password
 * Phải nhập đúng mật khẩu hiện tại: nếu ai đó mượn máy đang đăng nhập sẵn thì cũng không đổi được mật khẩu.
 */
public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.")
        String currentPassword,

        @StrongPassword
        String newPassword
) {
}
