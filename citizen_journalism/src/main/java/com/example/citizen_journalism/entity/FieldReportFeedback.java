package com.example.citizen_journalism.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Một lần BIÊN TẬP VIÊN PHẢN HỒI báo cáo hiện trường: yêu cầu sửa bài, yêu cầu bổ sung tư liệu hoặc duyệt.
 * Các dòng của 1 báo cáo xếp theo thời gian chính là cuộc trao đổi giữa toà soạn và Cộng tác viên,
 * dòng mới nhất cho biết báo cáo đang ở trạng thái nào (xem ReviewStatus.of).
 */
@Entity
@Table(name = "field_report_feedbacks", indexes = {
    @Index(name = "idx_field_report_feedbacks_report", columnList = "report_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldReportFeedback extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Report is required")
    @JoinColumn(name = "report_id", nullable = false)
    private FieldReport report;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Editor is required")
    @JoinColumn(name = "editor_id", nullable = false)
    private User editor;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Type is required")
    @Column(name = "type", nullable = false, length = 30)
    private Type type;

    /** Nội dung Biên tập viên yêu cầu; duyệt thì để trống. */
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /** Lời nhắn của CTV khi xử lý xong yêu cầu (không bắt buộc). */
    @Column(name = "response", columnDefinition = "TEXT")
    private String response;

    /** Lúc CTV xử lý xong yêu cầu; null nghĩa là yêu cầu còn đang chờ. */
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    /** Yêu cầu còn đang chờ Cộng tác viên xử lý. */
    public boolean isOpen() {
        return type != Type.APPROVED && resolvedAt == null;
    }

    public enum Type {
        REQUEST_REVISION, // Yêu cầu sửa bài viết
        REQUEST_EVIDENCE, // Yêu cầu bổ sung tư liệu
        APPROVED          // Duyệt báo cáo
    }

    /** Trạng thái xem xét của 1 báo cáo. Không lưu riêng mà suy ra từ phản hồi mới nhất, nên không bao giờ lệch nhau. */
    public enum ReviewStatus {
        PENDING_REVIEW,
        REVISION_REQUESTED,
        EVIDENCE_REQUESTED,
        APPROVED;

        /** @param latest phản hồi mới nhất; null nếu báo cáo chưa có phản hồi nào */
        public static ReviewStatus of(FieldReportFeedback latest) {
            if (latest == null) {
                return PENDING_REVIEW;
            }
            if (latest.getType() == Type.APPROVED) {
                return APPROVED;
            }
            if (!latest.isOpen()) {
                return PENDING_REVIEW; // CTV đã xử lý xong, chờ Biên tập viên xem lại
            }
            return latest.getType() == Type.REQUEST_REVISION ? REVISION_REQUESTED : EVIDENCE_REQUESTED;
        }
    }
}
