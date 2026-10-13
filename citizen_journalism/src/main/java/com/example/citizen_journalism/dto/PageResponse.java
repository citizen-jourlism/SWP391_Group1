package com.example.citizen_journalism.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Kết quả PHÂN TRANG gửi về frontend (dùng chung cho mọi danh sách có phân trang).
 *
 * Ví dụ: { items: [...10 người...], page: 0, size: 10, totalItems: 37, totalPages: 4 }
 *   - page bắt đầu từ 0 (trang đầu tiên là 0), frontend hiển thị +1 cho người dùng.
 *
 * TẠI SAO không trả thẳng Page của Spring? Page chứa rất nhiều trường nội bộ, khó đọc;
 * record này chỉ giữ đúng những gì giao diện cần.
 */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
