package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.*;

@Entity @Table(name="submissions")
@org.hibernate.annotations.SQLRestriction("record_kind = 'ACCOUNT_APPEAL'")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ViolationAppeal extends AccountSubmission {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="author_id", nullable=false) @NotNull
    private User user;
    @Column(name="content", nullable=false, columnDefinition="LONGTEXT")
    private String reason;
    @Column(name="workflow_evidence_note", columnDefinition="TEXT")
    private String evidenceNote;
    @Convert(converter=StatusConverter.class) @Column(name="status", nullable=false, length=50)
    @Builder.Default private Status status = Status.PENDING_EDITOR;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="workflow_reviewed_by")
    private User reviewedBy;
    @Column(name="workflow_review_note", columnDefinition="TEXT")
    private String reviewNote;
    @Column(name="workflow_reviewed_at")
    private LocalDateTime reviewedAt;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="workflow_decided_by")
    private User decidedBy;
    @Column(name="workflow_decision_note", columnDefinition="TEXT")
    private String decisionNote;
    @Column(name="workflow_decided_at")
    private LocalDateTime decidedAt;
    @Override protected String recordKind() { return "ACCOUNT_APPEAL"; }
    public enum Status { PENDING_EDITOR, PENDING_FINAL, APPROVED, REJECTED }
    @Converter
    public static class StatusConverter implements AttributeConverter<Status,String> {
        public String convertToDatabaseColumn(Status value) {
            if(value == null) return null;
            return switch(value) {
                case PENDING_EDITOR -> "PENDING";
                case PENDING_FINAL -> "DEPUTY_PENDING";
                case APPROVED -> "PUBLISHED";
                case REJECTED -> "REJECTED";
            };
        }
        public Status convertToEntityAttribute(String value) {
            if(value == null) return null;
            return switch(value) {
                case "PENDING" -> Status.PENDING_EDITOR;
                case "DEPUTY_PENDING" -> Status.PENDING_FINAL;
                case "PUBLISHED" -> Status.APPROVED;
                case "REJECTED" -> Status.REJECTED;
                default -> throw new IllegalArgumentException("Unknown appeal status: " + value);
            };
        }
    }
}
