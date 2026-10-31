package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.Size;

/**
 * Biên tập viên DUYỆT TIN NÓNG và chuyển Phó Tổng biên tập: POST /api/editor/submissions/{mã}/approve
 * Giới hạn khớp với frontend (components/editor/ApproveSubmissionDialog.jsx -> NOTE_MAX).
 *
 * @param note ghi chú NỘI BỘ gửi Phó Tổng biên tập (đánh giá, lưu ý khi duyệt), người gửi không thấy.
 *             Không bắt buộc, tối đa 1000 ký tự.
 */
public record ApproveSubmissionRequest(
        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự.")
        String note) {
}
