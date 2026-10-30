package com.example.citizen_journalism.dto.admin;

import jakarta.validation.constraints.NotBlank;

/**
 * Admin ĐẶT LẠI MẬT KHẨU cho người dùng quên mật khẩu mà không tự lấy lại được (ví dụ mất quyền vào email):
 * POST /api/admin/users/{id}/reset-password   Body: { "adminPassword": "..." }
 * adminPassword = mật khẩu của CHÍNH admin, nhập lại để xác nhận đúng người đang ngồi trước máy là admin.
 */
public record AdminResetPasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu của bạn.")
        String adminPassword
) {
}
