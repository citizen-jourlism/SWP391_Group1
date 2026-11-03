package com.example.citizen_journalism.dto.editor;

import java.util.List;

/**
 * Dữ liệu ô PHÂN LOẠI TIN trên trang hồ sơ của Biên tập viên (GET / PUT /api/editor/submissions/{mã}/category).
 *
 * @param categoryId    chuyên mục hồ sơ đang thuộc; null = chưa phân loại
 * @param deputyName    Phó TBT phụ trách chuyên mục đó; null nếu chưa phân loại hoặc chuyên mục chưa có người phụ trách
 * @param editable      còn được phân loại / đổi chuyên mục không (chỉ khi hồ sơ còn ở bàn Biên tập viên)
 * @param options       các chuyên mục đang hoạt động để chọn
 */
public record SubmissionCategoryResponse(Long categoryId, String categoryName, String deputyName, boolean editable,
                                         List<Option> options) {

    /** 1 chuyên mục để chọn, kèm Phó TBT phụ trách (null = chưa có người phụ trách). */
    public record Option(Long id, String name, String deputyName) {
    }
}
