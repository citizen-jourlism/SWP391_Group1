package com.example.citizen_journalism.dto.assignment;

import java.time.LocalDateTime;

/**
 * Một dòng trong LỊCH SỬ NHIỆM VỤ của 1 hồ sơ, chỉ Biên tập viên xem (khác nhật ký hồ sơ người gửi thấy:
 * ở đây có tên Cộng tác viên, lý do từ chối / huỷ...).
 *
 * @param at              thời điểm xảy ra
 * @param actorName       người thực hiện; null nếu không cần hiện (hồ sơ gửi tới không lộ danh tính người gửi)
 * @param contributorName Cộng tác viên liên quan
 * @param deadline        hạn hoàn thành (chỉ có ở bước giao việc)
 * @param detail          chỉ dẫn (bước giao việc), lý do (từ chối, huỷ, thu hồi), nội dung yêu cầu hoặc lời nhắn của CTV
 */
public record AssignmentHistoryEntry(
        Type type,
        LocalDateTime at,
        String actorName,
        String contributorName,
        LocalDateTime deadline,
        String detail) {

    public enum Type {
        SUBMITTED,
        ASSIGNED,
        ACCEPTED,
        DECLINED,
        CONTRIBUTOR_CANCELLED,
        EDITOR_CANCELLED,
        COMPLETED,
        REVISION_REQUESTED,
        EVIDENCE_REQUESTED,
        REVISION_SUBMITTED,
        EVIDENCE_SUBMITTED,
        REPORT_APPROVED
    }
}
