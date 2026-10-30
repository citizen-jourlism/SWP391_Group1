package com.example.citizen_journalism.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "field_assignments", indexes = {
    // 1. Tìm kiếm bài viết đã được giao (cho Producer xem danh sách)
    @Index(name = "idx_field_assignments_status_created", columnList = "status, created_at"),

    // 2. Tìm các bài giao việc cho một Biên tập viên cụ thể (lọc theo editor_id)
    @Index(name = "idx_field_assignments_editor", columnList = "contributor_id"),

    // 3. Thống kê nhanh các nhiệm vụ theo trạng thái
    @Index(name = "idx_field_assignments_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Submission is required")
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Creator is required")
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @NotBlank(message = "Title is required")
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Assignment mode is required")
    @Column(name = "assignment_mode", nullable = false, length = 20)
    private AssignmentMode assignmentMode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_id")
    private User contributor;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "output_submission_id")
    private Submission outputSubmission;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Status is required")
    @Column(name = "status", nullable = false, length = 50)
    private AssignmentStatus status;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    /** Chỉ dẫn tác nghiệp của Biên tập viên gửi Cộng tác viên (không bắt buộc). */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** Vì sao nhiệm vụ bị huỷ (chỉ có khi status = CANCELLED). */
    @Enumerated(EnumType.STRING)
    @Column(name = "cancel_type", length = 30)
    private CancelType cancelType;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    /** Người từ chối / huỷ / thu hồi, hiện trong lịch sử nhiệm vụ. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    /** Kết thúc nhiệm vụ ở trạng thái CANCELLED, ghi lại kiểu huỷ, lý do và người huỷ. */
    public void cancel(CancelType type, String reason, User actor) {
        status = AssignmentStatus.CANCELLED;
        cancelType = type;
        cancelReason = reason;
        cancelledBy = actor;
    }

    public enum AssignmentMode {
        BROADCAST,
        DIRECT
    }

    public enum AssignmentStatus {
        OPEN,
        ASSIGNED,
        ACCEPTED,
        CANCELLED,
        COMPLETED
    }

    /**
     * Các kiểu huỷ. Tách riêng thay vì thêm trạng thái mới vì cột status là kiểu ENUM của MySQL:
     * thêm giá trị mới thì DB đã tạo sẵn của mọi người sẽ từ chối ghi, phải tự ALTER TABLE.
     */
    public enum CancelType {
        DECLINED,              // CTV từ chối khi chưa nhận
        CONTRIBUTOR_CANCELLED, // CTV huỷ sau khi đã nhận
        EDITOR_CANCELLED       // Biên tập viên thu hồi
    }

}
