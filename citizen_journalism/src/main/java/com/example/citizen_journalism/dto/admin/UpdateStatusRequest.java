package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import jakarta.validation.constraints.NotNull;

/** Admin khoá / mở khoá tài khoản: PATCH /api/admin/users/{id}/status   Body: { "status": "LOCKED" | "ACTIVE" } */
public record UpdateStatusRequest(
        @NotNull(message = "Vui lòng chọn trạng thái.")
        User.Status status
) {
}
