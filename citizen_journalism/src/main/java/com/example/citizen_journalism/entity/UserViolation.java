package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name="submissions")
@org.hibernate.annotations.SQLRestriction("record_kind = 'ACCOUNT_VIOLATION'")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserViolation extends AccountSubmission {
    @Version @Column(name="workflow_version", nullable=false, columnDefinition="bigint default 0")
    private long version;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="author_id", nullable=false) @NotNull
    private User reportedUser;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="duplicate_submission_id")
    private Submission relatedSubmission;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assigned_editor_id", nullable=false) @NotNull
    private User reportedBy;
    @Enumerated(EnumType.STRING) @Column(name="workflow_violation_type", length=40) @NotNull
    private Type type;
    @Enumerated(EnumType.STRING) @Column(name="workflow_severity", length=20) @NotNull
    private Severity severity;
    @Column(name="content", nullable=false, columnDefinition="LONGTEXT")
    private String description;
    @Column(name="workflow_evidence_note", columnDefinition="TEXT")
    private String evidenceNote;
    @Convert(converter=StatusConverter.class) @Column(name="status", nullable=false, length=50) @NotNull
    private Status status;
    @Enumerated(EnumType.STRING) @Column(name="workflow_action", length=30)
    private Action proposedAction;
    @Column(name="workflow_points_deducted")
    private Integer pointsDeducted;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="workflow_reviewed_by")
    private User reviewedBy;
    @Column(name="workflow_review_note", columnDefinition="TEXT")
    private String reviewNote;
    @Column(name="workflow_retraction_snapshot", columnDefinition="LONGTEXT")
    private String retractionSnapshot;
    @Column(name="workflow_reviewed_at")
    private LocalDateTime reviewedAt;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="workflow_decided_by")
    private User approvedBy;
    @Column(name="workflow_decision_note", columnDefinition="TEXT")
    private String approvalNote;
    @Column(name="workflow_decided_at")
    private LocalDateTime approvedAt;
    @Override protected String recordKind() { return "ACCOUNT_VIOLATION"; }

    public enum Type { SPAM, FALSE_INFORMATION, INACCURATE_EVIDENCE, COPYRIGHT_VIOLATION, HARASSMENT, POLICY_VIOLATION, OTHER }
    public enum Severity { LOW, MEDIUM, HIGH, CRITICAL }
    public enum Status { PENDING_REVIEW, PENDING_APPROVAL, RESOLVED, DISMISSED, REJECTED }
    public enum Action { WARNING, DEDUCT_POINTS, LOCK_ACCOUNT, UNLOCK_ACCOUNT, RETRACT_CONTENT }
    @Converter
    public static class StatusConverter implements AttributeConverter<Status,String> {
        public String convertToDatabaseColumn(Status value) {
            if(value == null) return null;
            return switch(value) {
                case PENDING_REVIEW -> "PENDING";
                case PENDING_APPROVAL -> "DEPUTY_PENDING";
                case RESOLVED -> "PUBLISHED";
                case DISMISSED -> "CANCELLED";
                case REJECTED -> "REJECTED";
            };
        }
        public Status convertToEntityAttribute(String value) {
            if(value == null) return null;
            return switch(value) {
                case "PENDING" -> Status.PENDING_REVIEW;
                case "DEPUTY_PENDING" -> Status.PENDING_APPROVAL;
                case "PUBLISHED" -> Status.RESOLVED;
                case "CANCELLED" -> Status.DISMISSED;
                case "REJECTED" -> Status.REJECTED;
                default -> throw new IllegalArgumentException("Unknown violation status: " + value);
            };
        }
    }
}
