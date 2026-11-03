package com.example.citizen_journalism.dto.violation;

import com.example.citizen_journalism.entity.UserViolation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateViolationRequest(
        @NotBlank(message = "Vui lòng nhập mã tài khoản.") String userId,
        String trackingCode,
        @NotNull(message = "Vui lòng chọn loại vi phạm.") UserViolation.Type type,
        @NotNull(message = "Vui lòng chọn mức độ.") UserViolation.Severity severity,
        @NotBlank(message = "Vui lòng mô tả vi phạm.")
        @Size(min = 20, max = 3000, message = "Mô tả dài từ 20 đến 3000 ký tự.") String description,
        @Size(max = 2000, message = "Ghi chú chứng cứ tối đa 2000 ký tự.") String evidenceNote) {
}
