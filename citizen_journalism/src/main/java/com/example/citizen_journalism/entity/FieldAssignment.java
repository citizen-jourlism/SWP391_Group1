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

}
