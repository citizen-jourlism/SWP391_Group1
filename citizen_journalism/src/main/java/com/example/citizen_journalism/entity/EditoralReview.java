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

    // Dòng của hồ sơ phản ánh có submission; dòng của bài nghiên cứu có researchArticle (đúng 1 trong 2)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id")
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "research_article_id")
    private ResearchArticle researchArticle;

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

    /** Chỉ dùng cho action = REQUEST_EDIT: chờ tác giả phản hồi / đã đồng ý / đã từ chối. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "VARCHAR(20)")
    private RequestStatus status;

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

    public enum RequestStatus {
        PENDING,
        ACCEPTED,
        REJECTED
    }

}
