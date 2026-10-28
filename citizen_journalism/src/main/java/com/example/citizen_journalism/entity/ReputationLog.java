package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "reputation_logs", indexes = {
    // 1. Tìm lịch sử theo người dùng (lọc nhanh theo ID và sắp xếp thời gian)
    @Index(name = "idx_reputation_logs_user_created", columnList = "user_id, created_at"),

    // 2. Thống kê nhanh theo loại lý do
    @Index(name = "idx_reputation_logs_reason", columnList = "reason")
}, uniqueConstraints = @UniqueConstraint(name = "uk_reputation_contribution",
        columnNames = {"contribution_type", "contribution_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReputationLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "User is required")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Points change is required")
    @Column(name = "points_change", nullable = false)
    private Integer pointsChange;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Reason is required")
    @Column(name = "reason", nullable = false, length = 100)
    private ReputationReason reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_submission_id")
    private Submission relatedSubmission;

    @Enumerated(EnumType.STRING)
    @Column(name = "contribution_type", length = 40)
    private ContributionType contributionType;

    @Column(name = "contribution_id")
    private Long contributionId;

    public enum ContributionType {
        CITIZEN_SUBMISSION,
        EXPERT_RESEARCH_ARTICLE
    }

    public enum ReputationReason {
        INITIAL_CONTRIBUTOR_ONBOARDING,
        SUBMISSION_APPROVED,
        CITIZEN_SUBMISSION_PUBLISHED,
        EXPERT_RESEARCH_APPROVED,
        TASK_COMPLETED_ON_TIME,
        TASK_LATE,
        INACCURATE_EVIDENCE,
        SPAM_REPORTED,
        COPYRIGHT_VIOLATION
    }

}
