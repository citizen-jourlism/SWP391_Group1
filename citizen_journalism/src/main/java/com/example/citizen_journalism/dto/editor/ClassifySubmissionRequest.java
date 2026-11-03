package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotNull;

/** Biên tập viên phân loại hồ sơ vào 1 chuyên mục: PUT /api/editor/submissions/{mã}/category */
public record ClassifySubmissionRequest(
        @NotNull(message = "Vui lòng chọn chuyên mục.")
        Long categoryId) {
}
