package com.example.citizen_journalism.entity;

import jakarta.persistence.*;

/** Account reports share submissions, but never appear in the content queues. */
@MappedSuperclass
public abstract class AccountSubmission extends BaseEntity {
    @Column(name = "record_kind", length = 30)
    private String recordKind;
    @Column(name = "workflow_legacy_id")
    private Long legacyId;
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private Submission.SubmissionType submissionType = Submission.SubmissionType.COMPLAINT;
    @Column(name = "title", nullable = false, length = 255)
    private String title = "Account review";
    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;
    @Column(name = "pin_failed_attempts", nullable = false, columnDefinition = "int default 0")
    private int pinFailedAttempts;

    protected abstract String recordKind();

    @PrePersist
    void classify() { recordKind = recordKind(); }

    @Override
    public Long getId() { return legacyId == null ? super.getId() : legacyId; }
}
