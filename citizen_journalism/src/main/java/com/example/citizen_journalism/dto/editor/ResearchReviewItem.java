package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.ResearchArticle;
import java.time.LocalDateTime;

public record ResearchReviewItem(
        Long id,
        String title,
        String abstractText,
        String field,
        String keywords,
        String authorId,
        String authorName,
        String authorEmail,
        LocalDateTime submittedAt) {

    public static ResearchReviewItem from(ResearchArticle article) {
        return new ResearchReviewItem(article.getId(), article.getTitle(), article.getAbstractText(),
                article.getField(), article.getKeywords(), article.getAuthor().getId(),
                article.getAuthor().getFullName(), article.getAuthor().getEmail(), article.getSubmittedAt());
    }
}
