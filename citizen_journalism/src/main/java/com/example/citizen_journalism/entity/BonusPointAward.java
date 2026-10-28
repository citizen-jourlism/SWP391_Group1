package com.example.citizen_journalism.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bonus_point_awards",
        uniqueConstraints = @UniqueConstraint(name = "uk_bonus_award_contribution",
                columnNames = {"contribution_type", "contribution_id"}),
        indexes = @Index(name = "idx_bonus_awards_user_created", columnList = "user_id, created_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BonusPointAward extends BaseEntity {

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "contribution_type", nullable = false, length = 40)
    @NotNull
    private ContributionType contributionType;

    @Column(name = "contribution_id", nullable = false)
    @NotNull
    private Long contributionId;

    @Column(name = "points", nullable = false)
    private int points;

    public enum ContributionType {
        CITIZEN_SUBMISSION,
        EXPERT_RESEARCH_ARTICLE
    }
}
