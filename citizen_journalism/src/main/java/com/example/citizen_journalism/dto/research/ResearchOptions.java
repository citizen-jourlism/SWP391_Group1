package com.example.citizen_journalism.dto.research;

import java.util.List;

/**
 * Dữ liệu cho trình soạn bài nghiên cứu (GET /api/research/options): danh sách lĩnh vực, các ngưỡng khi nộp bài,
 * giới hạn ảnh. Khai báo 1 lần ở backend (ResearchArticleService), frontend đọc về để hiện bảng kiểm tra trước khi nộp.
 */
public record ResearchOptions(
        List<String> fields,
        int minTitleLength,
        int minAbstractLength,
        int minWords,
        int maxImages,
        long maxImageSizeMb,
        List<String> acceptedImageTypes,
        long draftCount,
        long submittedCount) {
}
