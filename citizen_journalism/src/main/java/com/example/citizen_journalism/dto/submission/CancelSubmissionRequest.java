package com.example.citizen_journalism.dto.submission;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Người gửi HUỶ hồ sơ đang chờ xử lý: POST /api/submissions/mine/{mã}/cancel
 * Giới hạn khớp với frontend (components/submission/CancelSubmissionDialog.jsx -> NOTE_MAX).
 *
 * @param reason lý do huỷ (bắt buộc)
 * @param note   ghi chú gửi toà soạn, hiện trong nhật ký xử lý. Không bắt buộc, tối đa 500 ký tự;
 *               bắt buộc khi chọn "Lý do khác" (kiểm tra trong SubmissionCancelService)
 */
public record CancelSubmissionRequest(
        @NotNull(message = "Vui lòng chọn lý do huỷ.")
        CancelReason reason,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note) {

    /**
     * LÝ DO HUỶ HỒ SƠ do người gửi chọn. Giống danh sách CANCEL_REASONS ở frontend lib/cancellation.js.
     *
     * DB không có cột riêng cho lý do: tên lý do được ghi vào mô tả bước nhật ký
     * ("Người gửi đã huỷ hồ sơ: Sự việc đã được giải quyết."), ghi chú của người gửi nằm ở note của bước đó.
     *
     * expertOnly = true: chỉ Chuyên gia được chọn (chuyển tin báo thành bài phân tích chuyên môn).
     */
    @Getter
    @RequiredArgsConstructor
    public enum CancelReason {
        DUPLICATE("Gửi nhầm hoặc gửi trùng hồ sơ khác", false),
        INACCURATE("Thông tin chưa chính xác, sẽ gửi lại", false),
        RESOLVED("Sự việc đã được giải quyết", false),
        NO_LONGER_NEEDED("Không muốn tiếp tục phản ánh", false),
        TO_ARTICLE("Chuyển thành bài phân tích chuyên môn", true),
        OTHER("Lý do khác", false);

        private final String label;
        private final boolean expertOnly;
    }
}
