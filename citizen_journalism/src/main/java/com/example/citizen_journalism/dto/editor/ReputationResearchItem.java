package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.ResearchArticle.Status;
import java.time.LocalDateTime;

public record ReputationResearchItem(
        Long id,
        String title,
        String abstractText,
        String field,
        Status status,
        LocalDateTime submittedAt,
        boolean reputationReviewed) {

    public static ReputationResearchItem from(ResearchArticle article, boolean reputationReviewed) {
        return new ReputationResearchItem(article.getId(), article.getTitle(), article.getAbstractText(),
                article.getField(), article.getStatus(), article.getSubmittedAt(), reputationReviewed);
    }
}
