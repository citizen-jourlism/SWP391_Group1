package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.Size;

/**
 * Biên tập viên GHI NHẬN KHÔNG TRÙNG (chỉ lưu kết luận): POST /api/editor/submissions/{mã}/duplicates/dismiss
 *
 * @param note ghi chú NỘI BỘ (người gửi không thấy), không bắt buộc, tối đa 500 ký tự
 */
public record DismissDuplicateRequest(
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note) {
}
