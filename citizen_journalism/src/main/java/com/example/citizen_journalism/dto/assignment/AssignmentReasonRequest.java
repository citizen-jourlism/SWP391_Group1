package com.example.citizen_journalism.dto.assignment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Lý do khi Cộng tác viên từ chối / huỷ nhiệm vụ, Biên tập viên thu hồi nhiệm vụ hoặc yêu cầu sửa báo cáo. */
public record AssignmentReasonRequest(
        @NotBlank(message = "Vui lòng nhập lý do.")
        @Size(min = 10, max = 2000, message = "Lý do từ 10 đến 2000 ký tự.")
        String reason
) {
}
