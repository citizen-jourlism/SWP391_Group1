package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "reputation_logs")
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

    public enum ReputationReason {
        INITIAL_CONTRIBUTOR_ONBOARDING,
        SUBMISSION_APPROVED,
        TASK_COMPLETED_ON_TIME,
        TASK_LATE,
        INACCURATE_EVIDENCE,
        SPAM_REPORTED,
        COPYRIGHT_VIOLATION
    }

}
