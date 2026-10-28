package com.example.citizen_journalism.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Báo cáo vi phạm và toàn bộ dấu vết xét duyệt liên quan đến một tài khoản. */
@Entity
@Table(name = "user_violations", indexes = {
        @Index(name = "idx_user_violations_status_created", columnList = "status, created_at"),
        @Index(name = "idx_user_violations_user_created", columnList = "user_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserViolation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User reportedUser;

    @Column(name = "reported_user_id", nullable = false)
    private String currentReportedUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_submission_id")
    private Submission relatedSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_id", nullable = false)
    @NotNull
    private User reportedBy;

    @Column(name = "reported_by", nullable = false)
    private String legacyReportedById;

    @Column(name = "violation_type", nullable = false, length = 40)
    private String legacyViolationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    @NotNull
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    @NotNull
    private Severity severity;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_note", columnDefinition = "TEXT")
    private String evidenceNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @NotNull
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(name = "proposed_action", length = 30)
    private Action proposedAction;

    @Column(name = "points_deducted")
    private Integer pointsDeducted;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "retraction_snapshot", columnDefinition = "LONGTEXT")
    private String retractionSnapshot;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approval_note", columnDefinition = "TEXT")
    private String approvalNote;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @PrePersist
    private void populateLegacyColumns() {
        currentReportedUserId = reportedUser.getId();
        legacyReportedById = reportedBy.getId();
        legacyViolationType = legacyTypeOf(type);
    }

    private static String legacyTypeOf(Type type) {
        return switch (type) {
            case COPYRIGHT_VIOLATION -> "COPYRIGHT";
            case FALSE_INFORMATION, INACCURATE_EVIDENCE -> "FAKE_NEWS";
            case SPAM, HARASSMENT, POLICY_VIOLATION, OTHER -> "SPAM";
        };
    }

    public enum Type {
        SPAM,
        FALSE_INFORMATION,
        INACCURATE_EVIDENCE,
        COPYRIGHT_VIOLATION,
        HARASSMENT,
        POLICY_VIOLATION,
        OTHER
    }

    public enum Severity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum Status {
        PENDING_REVIEW,
        PENDING_APPROVAL,
        RESOLVED,
        DISMISSED,
        REJECTED
    }

    public enum Action {
        WARNING,
        DEDUCT_POINTS,
        LOCK_ACCOUNT,
        UNLOCK_ACCOUNT,
        RETRACT_CONTENT
    }
}
