package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.entity.FieldReportFeedback;
import java.time.LocalDateTime;

/**
 * Một lần Biên tập viên phản hồi báo cáo, kèm lời nhắn của Cộng tác viên khi xử lý xong.
 *
 * @param resolvedAt lúc CTV xử lý xong; null nếu yêu cầu còn đang chờ hoặc đây là lần duyệt
 */
public record ReportFeedbackView(
        Long id,
        FieldReportFeedback.Type type,
        String editorName,
        String message,
        String response,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt) {

    public static ReportFeedbackView from(FieldReportFeedback feedback) {
        return new ReportFeedbackView(feedback.getId(), feedback.getType(), feedback.getEditor().getFullName(),
                feedback.getMessage(), feedback.getResponse(), feedback.getCreatedAt(), feedback.getResolvedAt());
    }
}
