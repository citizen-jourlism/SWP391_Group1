package com.example.citizen_journalism.dto.research;

import com.example.citizen_journalism.entity.ResearchArticle.Status;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Toàn bộ 1 bài nghiên cứu để mở lại trong trình soạn thảo (tiếp tục viết bản nháp, hoặc xem bài đã nộp).
 * Chỉ tác giả xem được (GET /api/research/{id}).
 */
public record ResearchArticleView(
        Long id,
        Status status,
        String title,
        String abstractText,
        String field,
        String keywords,
        String content,
        String references,
        Boolean hasConflict,
        String conflictNote,
        List<Image> images,
        int wordCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime submittedAt) {

    /** Một ảnh đã lưu: đường dẫn xem, tên gốc, dung lượng, chú thích. */
    public record Image(String url, String name, long size, String caption) {
    }
}
