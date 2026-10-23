package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * NHẬT KÝ XỬ LÝ của một hồ sơ (số bước, thời điểm, người thực hiện, mô tả).
 * Mỗi lần hồ sơ đổi trạng thái thì thêm 1 dòng (xem SubmissionEventService.record).
 *
 * Người gửi XEM ĐƯỢC toàn bộ bảng này khi tra cứu, nên:
 *   - Chỉ ghi VAI TRÒ người thực hiện (Biên tập viên, Phó TBT...), không ghi tên/mã nhân sự.
 *   - Ghi chú nội bộ của toà soạn KHÔNG để ở đây (để ở editorial_reviews.comments).
 * created_at (kế thừa BaseEntity) = thời điểm của bước.
 */
@Entity
@Table(name = "submission_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionEvent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    /** Trạng thái của hồ sơ SAU bước này. */
    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(name = "status", nullable = false, length = 50)
    private Submission.SubmissionStatus status;

    /** Ai thực hiện bước này (vai trò, không phải người cụ thể). */
    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(name = "actor", nullable = false, length = 30)
    private Actor actor;

    /** Mô tả ngắn cho người gửi đọc, ví dụ "Toà soạn đã tiếp nhận hồ sơ". */
    @NotBlank
    @Column(name = "description", nullable = false, length = 255)
    private String description;

    /**
     * Lời nhắn của toà soạn GỬI NGƯỜI DÂN (không bắt buộc), ví dụ khi đề nghị bổ sung:
     * "Vui lòng gửi thêm ảnh chụp toàn cảnh khu vực". Hiện ở ô "Toà soạn đề nghị bổ sung".
     */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** Người thực hiện một bước: người gửi, hệ thống tự động, hoặc vai trò trong toà soạn. */
    public enum Actor {
        REPORTER,
        SYSTEM,
        EDITOR,
        CONTRIBUTOR,
        DEPUTY_EIC,
        EIC
    }
}
