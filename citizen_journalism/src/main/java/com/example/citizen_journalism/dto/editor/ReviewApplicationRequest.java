package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Biên tập viên XÉT DUYỆT đơn CTV: POST /api/editor/applications/{id}/review
 *
 * @param decision FORWARD = đạt, chuyển Phó Tổng biên tập phê duyệt; REJECT = từ chối
 * @param note     ghi chú gửi người nộp đơn. BẮT BUỘC khi từ chối (người dân cần biết lý do) - kiểm tra trong service.
 */
public record ReviewApplicationRequest(
        @NotNull(message = "Vui lòng chọn kết quả xét duyệt.")
        Decision decision,

        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự.")
        String note) {

    public enum Decision {
        FORWARD,
        REJECT
    }
}
