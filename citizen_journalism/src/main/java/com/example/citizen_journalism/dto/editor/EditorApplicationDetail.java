package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.contributor.ApplicationView;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * CHI TIẾT 1 ĐƠN cho Biên tập viên xét duyệt.
 * Gồm nội dung đơn + HỒ SƠ người nộp (thông tin liên hệ, giấy tờ, điểm uy tín, số tin đã gửi).
 * Chỉ Biên tập viên xem được (API /api/editor/**).
 */
public record EditorApplicationDetail(ApplicationView application, Applicant applicant) {

    /**
     * @param submissionCount số tin / khiếu nại người này đã gửi (tham khảo mức độ tích cực)
     */
    public record Applicant(
            String id,
            String fullName,
            String email,
            String phone,
            String citizenId,
            LocalDate dateOfBirth,
            String address,
            String avatarUrl,
            Integer reputationScore,
            int rewardPoints,
            LocalDateTime memberSince,
            long submissionCount) {
    }
}
