package com.example.citizen_journalism.dto.assignment;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * Biên tập viên GIAO NHIỆM VỤ xác minh hiện trường: POST /api/editor/assignments
 * (màn hình chọn Cộng tác viên, routes/editor/EditorAssignContributor.jsx).
 */
public record AssignContributorRequest(
        @NotBlank(message = "Thiếu mã hồ sơ.")
        String trackingCode,

        @NotBlank(message = "Vui lòng chọn Cộng tác viên.")
        String contributorId,

        @NotNull(message = "Vui lòng chọn hạn hoàn thành.")
        @Future(message = "Hạn hoàn thành phải ở tương lai.")
        LocalDateTime deadline,

        @Size(max = 1000, message = "Chỉ dẫn tối đa 1000 ký tự.")
        String note
) {
}
