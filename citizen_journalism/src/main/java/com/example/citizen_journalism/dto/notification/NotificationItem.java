
package com.example.citizen_journalism.dto.notification;

import java.time.LocalDateTime;

/** Thông báo chỉ đọc, tổng hợp từ dữ liệu nghiệp vụ đã lưu. */
public record NotificationItem(
        String id,
        String type,
        String trackingCode,
        String title,
        String status,
        String message,
        String note,
        LocalDateTime createdAt,
        String link
) {}
