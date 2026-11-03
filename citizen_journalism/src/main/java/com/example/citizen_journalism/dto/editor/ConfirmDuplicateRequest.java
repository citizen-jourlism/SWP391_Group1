package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Biên tập viên GHI NHẬN hồ sơ trùng sự việc với một hồ sơ khác: POST /api/editor/submissions/{mã}/duplicates/confirm
 * Chỉ lưu kết luận (AI chỉ hỗ trợ ra quyết định), không gộp hay đổi dữ liệu hồ sơ.
 * Giới hạn ghi chú khớp với frontend (routes/editor/EditorDuplicateCheck.jsx -> NOTE_MAX).
 *
 * @param originalCode mã hồ sơ bị trùng, ví dụ "KB-2026-0001"
 * @param note         ghi chú NỘI BỘ (người gửi không thấy), không bắt buộc, tối đa 500 ký tự
 */
public record ConfirmDuplicateRequest(
        @NotBlank(message = "Vui lòng chọn hồ sơ bị trùng.")
        String originalCode,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note) {
}
