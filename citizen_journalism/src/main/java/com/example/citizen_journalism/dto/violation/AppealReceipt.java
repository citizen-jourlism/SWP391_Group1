package com.example.citizen_journalism.dto.violation;

import com.example.citizen_journalism.entity.ViolationAppeal;
import java.time.LocalDateTime;

public record AppealReceipt(Long id, ViolationAppeal.Status status, LocalDateTime createdAt) {

    public static AppealReceipt from(ViolationAppealView appeal) {
        return new AppealReceipt(appeal.id(), appeal.status(), appeal.createdAt());
    }
}
