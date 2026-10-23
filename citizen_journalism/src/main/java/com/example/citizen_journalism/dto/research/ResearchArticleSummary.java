package com.example.citizen_journalism.dto.research;

import com.example.citizen_journalism.entity.ResearchArticle.Status;
import java.time.LocalDateTime;

/**
 * Một thẻ trong trang "Bài nghiên cứu của tôi" (danh sách bản nháp / bài đã nộp).
 *
 * @param excerpt vài câu đầu của tóm tắt (hoặc nội dung nếu chưa có tóm tắt) để nhận ra bài
 */
public record ResearchArticleSummary(
        Long id,
        Status status,
        String title,
        String field,
        String excerpt,
        int wordCount,
        int imageCount,
        LocalDateTime updatedAt,
        LocalDateTime submittedAt) {
}
