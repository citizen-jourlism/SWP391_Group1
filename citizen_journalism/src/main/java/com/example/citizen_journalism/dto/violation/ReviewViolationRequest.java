package com.example.citizen_journalism.dto.violation;

import com.example.citizen_journalism.entity.UserViolation;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewViolationRequest(
        @NotNull(message = "Vui lòng chọn quyết định.") Decision decision,
        UserViolation.Action action,
        @Min(value = 1, message = "Số điểm trừ phải từ 1 trở lên.")
        @Max(value = 100, message = "Mỗi lần chỉ được trừ tối đa 100 điểm.") Integer points,
        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự.") String note) {

    public enum Decision {
        DISMISS,
        HANDLE,
        ESCALATE
    }
}
