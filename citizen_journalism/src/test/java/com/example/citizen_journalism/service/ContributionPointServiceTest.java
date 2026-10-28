package com.example.citizen_journalism.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.citizen_journalism.entity.BonusPointAward;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.BonusPointAwardRepository;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class ContributionPointServiceTest {

    private final SubmissionRepository submissionRepository = org.mockito.Mockito.mock(SubmissionRepository.class);
    private final ResearchArticleRepository researchArticleRepository = org.mockito.Mockito.mock(ResearchArticleRepository.class);
    private final BonusPointAwardRepository awardRepository = org.mockito.Mockito.mock(BonusPointAwardRepository.class);
    private final ContributionPointService service =
            new ContributionPointService(submissionRepository, researchArticleRepository, awardRepository);

    @Test
    void awardsConfiguredPointsToPublishedCitizenSubmissionsAndApprovedExpertArticles() {
        User citizen = User.builder().id("CT00000001").rewardPoints(4).build();
        Submission submission = Submission.builder().author(citizen).build();
        submission.setId(11L);
        User expert = User.builder().id("EX00000001").rewardPoints(2).build();
        ResearchArticle article = ResearchArticle.builder().author(expert).build();
        article.setId(22L);

        when(submissionRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(submission)));
        when(researchArticleRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(article)));
        when(awardRepository.existsByContributionTypeAndContributionId(any(), any())).thenReturn(false);

        ContributionPointService.AwardSummary result = service.accumulate(5, 10);

        assertEquals(1, result.citizenAwards());
        assertEquals(1, result.expertAwards());
        assertEquals(9, citizen.getRewardPoints());
        assertEquals(12, expert.getRewardPoints());
        verify(awardRepository).save(org.mockito.ArgumentMatchers.argThat(award ->
                award.getContributionType() == BonusPointAward.ContributionType.CITIZEN_SUBMISSION
                        && award.getContributionId().equals(11L) && award.getPoints() == 5));
        verify(awardRepository).save(org.mockito.ArgumentMatchers.argThat(award ->
                award.getContributionType() == BonusPointAward.ContributionType.EXPERT_RESEARCH_ARTICLE
                        && award.getContributionId().equals(22L) && award.getPoints() == 10));
        verify(submissionRepository).findByStatusAndAuthorRole(Submission.SubmissionStatus.PUBLISHED,
                User.Role.CITIZEN, PageRequest.of(0, 200, org.springframework.data.domain.Sort.by("id").ascending()));
        verify(researchArticleRepository).findByStatusAndAuthorRole(ResearchArticle.Status.APPROVED,
                User.Role.EXPERT, PageRequest.of(0, 200, org.springframework.data.domain.Sort.by("id").ascending()));
    }

    @Test
    void doesNotAwardTheSameContributionTwice() {
        User citizen = User.builder().id("CT00000001").rewardPoints(4).build();
        Submission submission = Submission.builder().author(citizen).build();
        submission.setId(11L);
        when(submissionRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(submission)));
        when(researchArticleRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(awardRepository.existsByContributionTypeAndContributionId(
                BonusPointAward.ContributionType.CITIZEN_SUBMISSION, 11L)).thenReturn(true);

        ContributionPointService.AwardSummary result = service.accumulate(5, 10);

        assertEquals(0, result.totalAwards());
        assertEquals(4, citizen.getRewardPoints());
        verify(awardRepository, never()).save(any());
    }
}
