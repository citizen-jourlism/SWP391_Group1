package com.example.citizen_journalism.dto.editor;

import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * LÝ DO TỪ CHỐI hồ sơ (Biên tập viên, màn Reject Submission). Giống danh sách REJECT_REASONS ở frontend lib/rejection.js.
 *
 * DB không có cột riêng cho lý do: mã lý do được ghi đầu cột editorial_reviews.comments dạng "[SPAM] ghi chú nội bộ",
 * tên lý do được ghi vào mô tả bước nhật ký ("Không tiếp nhận hồ sơ: Tin rác, quảng cáo.").
 */
@Getter
@RequiredArgsConstructor
public enum RejectReason {
    SPAM("Tin rác, quảng cáo"),
    INSUFFICIENT("Thiếu thông tin, không thể xác minh"),
    OUT_OF_SCOPE("Ngoài phạm vi tiếp nhận"),
    INAPPROPRIATE("Nội dung vi phạm"),
    OTHER("Lý do khác");

    private final String label;

    /** Đổi mã đọc từ DB ("SPAM") thành enum; mã lạ / null -> OTHER (không làm hỏng trang khi dữ liệu cũ sai). */
    public static RejectReason fromCode(String code) {
        return Arrays.stream(values()).filter(reason -> reason.name().equals(code)).findFirst().orElse(OTHER);
    }
}
