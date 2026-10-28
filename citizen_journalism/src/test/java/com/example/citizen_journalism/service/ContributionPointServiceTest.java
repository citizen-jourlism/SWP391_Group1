package com.example.citizen_journalism.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class ContributionPointServiceTest {

    private final SubmissionRepository submissionRepository = org.mockito.Mockito.mock(SubmissionRepository.class);
    private final ResearchArticleRepository researchArticleRepository = org.mockito.Mockito.mock(ResearchArticleRepository.class);
    private final ReputationLogRepository reputationLogRepository = org.mockito.Mockito.mock(ReputationLogRepository.class);
    private final ContributionPointService service =
            new ContributionPointService(submissionRepository, researchArticleRepository, reputationLogRepository);

    @Test
    void awardsConfiguredPointsToPublishedCitizenSubmissionsAndApprovedExpertArticles() {
        User citizen = User.builder().id("CT00000001").reputationScore(70).status(User.Status.ACTIVE).build();
        Submission submission = Submission.builder().author(citizen).build();
        submission.setId(11L);
        User expert = User.builder().id("EX00000001").reputationScore(85).status(User.Status.ACTIVE).build();
        ResearchArticle article = ResearchArticle.builder().author(expert).build();
        article.setId(22L);

        when(submissionRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(submission)));
        when(researchArticleRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(article)));
        when(reputationLogRepository.existsByContributionTypeAndContributionId(any(), any())).thenReturn(false);

        ContributionPointService.AwardSummary result = service.accumulate(5, 10);

        assertEquals(1, result.citizenAwards());
        assertEquals(1, result.expertAwards());
        assertEquals(75, citizen.getReputationScore());
        assertEquals(User.Status.LOCKED, citizen.getStatus());
        assertEquals(95, expert.getReputationScore());
        verify(reputationLogRepository).save(org.mockito.ArgumentMatchers.argThat(log ->
                log.getContributionType() == ReputationLog.ContributionType.CITIZEN_SUBMISSION
                        && log.getContributionId().equals(11L) && log.getPointsChange() == 5
                        && log.getReason() == ReputationLog.ReputationReason.CITIZEN_SUBMISSION_PUBLISHED
                        && log.getRelatedSubmission() == submission));
        verify(reputationLogRepository).save(org.mockito.ArgumentMatchers.argThat(log ->
                log.getContributionType() == ReputationLog.ContributionType.EXPERT_RESEARCH_ARTICLE
                        && log.getContributionId().equals(22L) && log.getPointsChange() == 10
                        && log.getReason() == ReputationLog.ReputationReason.EXPERT_RESEARCH_APPROVED));
        verify(submissionRepository).findByStatusAndAuthorRole(Submission.SubmissionStatus.PUBLISHED,
                User.Role.CITIZEN, PageRequest.of(0, 200, org.springframework.data.domain.Sort.by("id").ascending()));
        verify(researchArticleRepository).findByStatusAndAuthorRole(ResearchArticle.Status.APPROVED,
                User.Role.EXPERT, PageRequest.of(0, 200, org.springframework.data.domain.Sort.by("id").ascending()));
    }

    @Test
    void doesNotAwardTheSameContributionTwice() {
        User citizen = User.builder().id("CT00000001").reputationScore(100).status(User.Status.ACTIVE).build();
        Submission submission = Submission.builder().author(citizen).build();
        submission.setId(11L);
        when(submissionRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(submission)));
        when(researchArticleRepository.findByStatusAndAuthorRole(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(reputationLogRepository.existsByContributionTypeAndContributionId(
                ReputationLog.ContributionType.CITIZEN_SUBMISSION, 11L)).thenReturn(true);

        ContributionPointService.AwardSummary result = service.accumulate(5, 10);

        assertEquals(0, result.totalAwards());
        assertEquals(100, citizen.getReputationScore());
        verify(reputationLogRepository, org.mockito.Mockito.never()).save(any());
    }
}
