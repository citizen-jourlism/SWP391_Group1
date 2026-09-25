package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Type is required")
    @Column(name = "type", nullable = false, length = 30)
    private SubmissionType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Author is required")
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_editor_id")
    private User assignedEditor;

    @NotBlank(message = "Title is required")
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @NotBlank(message = "Content is required")
    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "is_anonymous", nullable = false)
    @Builder.Default
    private Boolean isAnonymous = false;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Status is required")
    @Column(name = "status", nullable = false, length = 50)
    private SubmissionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 30)
    private Priority priority;

    @Column(name = "impact_score")
    private Integer impactScore;

    @Column(name = "is_spam")
    @Builder.Default
    private Boolean isSpam = false;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_submission_id")
    private Submission duplicateSubmission;

    @Column(name = "is_revealed")
    @Builder.Default
    private Boolean isRevealed = false;

    @Column(name = "reveal_reason", columnDefinition = "TEXT")
    private String revealReason;

    public enum SubmissionType {
        HOT_NEWS,
        COMPLAINT,
        CONTRIBUTOR_POST,
        RESEARCH_PAPER
    }

    public enum SubmissionStatus {
        PENDING,
        CANCELLED,
        IN_REVIEW,
        NEED_MORE_INFO,
        REJECTED,
        DEPUTY_PENDING,
        DEPUTY_REJECTED,
        EIC_PENDING,
        EIC_REJECTED,
        READY_FOR_PUBLISHING,
        PUBLISHED,
        CORRECTED,
        RETRACTED
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        BREAKING
    }

}
