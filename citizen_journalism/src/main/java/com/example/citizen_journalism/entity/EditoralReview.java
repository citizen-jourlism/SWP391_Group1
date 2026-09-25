package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "editorial_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditoralReview extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Submission is required")
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Reviewer is required")
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Review role is required")
    @Column(name = "review_role", nullable = false, length = 50)
    private ReviewRole reviewRole;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Action is required")
    @Column(name = "action", nullable = false, length = 50)
    private ReviewAction action;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "content_snapshot", columnDefinition = "LONGTEXT")
    private String contentSnapshot;

    public enum ReviewRole {
        EDITOR,
        DEPUTY_EIC,
        EIC
    }

    public enum ReviewAction {
        REQUEST_INFO,
        APPROVE,
        REJECT,
        REQUEST_EDIT,
        ESCALATE,
        RETRACT
    }

}
