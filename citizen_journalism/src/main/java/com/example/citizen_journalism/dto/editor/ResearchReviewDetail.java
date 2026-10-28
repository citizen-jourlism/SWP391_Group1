package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.ResearchArticle.Status;
import java.time.LocalDateTime;

public record ResearchReviewDetail(
        Long id,
        Status status,
        String title,
        String abstractText,
        String field,
        String keywords,
        String content,
        String referenceList,
        Boolean hasConflict,
        String conflictNote,
        String authorId,
        String authorName,
        String authorEmail,
        LocalDateTime submittedAt,
        String reviewerName,
        LocalDateTime approvedAt) {

    public static ResearchReviewDetail from(ResearchArticle article) {
        return new ResearchReviewDetail(article.getId(), article.getStatus(), article.getTitle(),
                article.getAbstractText(), article.getField(), article.getKeywords(), article.getContent(),
                article.getReferenceList(), article.getHasConflict(), article.getConflictNote(),
                article.getAuthor().getId(), article.getAuthor().getFullName(), article.getAuthor().getEmail(),
                article.getSubmittedAt(), article.getApprovedBy() == null ? null : article.getApprovedBy().getFullName(),
                article.getApprovedAt());
    }
}
