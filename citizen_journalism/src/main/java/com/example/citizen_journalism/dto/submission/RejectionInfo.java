package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.dto.editor.RejectReason;
import java.time.LocalDateTime;

/**
 * Lần TỪ CHỐI gần nhất của một hồ sơ (chỉ có khi trạng thái là REJECTED). Gom từ:
 * editorial_reviews (action REJECT) + bước nhật ký REJECTED + reputation_logs (điểm bị trừ).
 *
 * Người gửi xem (forReporter) thì internalNote và reviewerName luôn null: ghi chú nội bộ và tên nhân sự không được lộ ra ngoài.
 *
 * @param feedback      phản hồi gửi người gửi (= ghi chú của bước nhật ký REJECTED)
 * @param penaltyPoints số điểm uy tín đã trừ (0 nếu không trừ)
 */
public record RejectionInfo(
        RejectReason reason,
        String reasonLabel,
        String feedback,
        String internalNote,
        int penaltyPoints,
        String reviewerName,
        LocalDateTime rejectedAt) {

    /** Bản cho người gửi: bỏ ghi chú nội bộ và tên Biên tập viên. */
    public RejectionInfo forReporter() {
        return new RejectionInfo(reason, reasonLabel, feedback, null, penaltyPoints, null, rejectedAt);
    }
}
