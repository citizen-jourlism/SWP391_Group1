package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import jakarta.validation.constraints.NotNull;

/** Admin đổi vai trò: PATCH /api/admin/users/{id}/role   Body: { "role": "EDITOR" } (không được là SYSTEM_ADMIN) */
public record UpdateRoleRequest(
        @NotNull(message = "Vui lòng chọn vai trò.")
        User.Role role
) {
}
