package com.example.citizen_journalism.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.citizen_journalism.dto.editor.ReviewSubmissionRequest;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class EditorServiceReviewTest {

    private final SubmissionRepository submissionRepository = mock(SubmissionRepository.class);
    private final ResearchArticleRepository researchArticleRepository = mock(ResearchArticleRepository.class);
    private final ReputationLogRepository reputationLogRepository = mock(ReputationLogRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SubmissionEventService submissionEventService =
            new SubmissionEventService(mock(SubmissionEventRepository.class));
    private final EditorService service = new EditorService(
            submissionRepository,
            mock(SubmissionTrackingService.class),
            mock(ContributorApplicationService.class),
            reputationLogRepository,
            submissionEventService,
            userRepository,
            researchArticleRepository);

    @Test
    void approvingCitizenSubmissionAtMaximumDoesNotIncreaseReputation() {
        User citizen = user(100);
        Submission submission = submission(citizen);
        when(submissionRepository.findForReviewByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));
        when(submissionRepository.findByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));

        var result = service.reviewSubmission("kb-2026-0001",
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.APPROVE, null));

        assertEquals(SubmissionStatus.PUBLISHED, submission.getStatus());
        assertEquals(0, result.pointsChange());
        assertEquals(100, citizen.getReputationScore());
        assertEquals(User.Status.ACTIVE, citizen.getStatus());
        verify(reputationLogRepository).save(any(ReputationLog.class));
    }

    @Test
    void approvingCitizenSubmissionAwardsOnlyUpToMaximumScore() {
        User citizen = user(98);
        Submission submission = submission(citizen);
        when(submissionRepository.findForReviewByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));
        when(submissionRepository.findByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));

        var result = service.reviewSubmission("KB-2026-0001",
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.APPROVE, null));

        assertEquals(2, result.pointsChange());
        assertEquals(100, citizen.getReputationScore());
    }

    @Test
    void fakeNewsDeductsTenAndLocksCitizenBelowEighty() {
        User citizen = user(85);
        Submission submission = submission(citizen);
        when(submissionRepository.findForReviewByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));
        when(submissionRepository.findByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));

        var result = service.reviewSubmission("KB-2026-0001",
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.FAKE_NEWS, "Thông tin đã được xác minh là sai."));

        assertEquals(SubmissionStatus.RETRACTED, submission.getStatus());
        assertEquals(-10, result.pointsChange());
        assertEquals(75, citizen.getReputationScore());
        assertEquals(User.Status.LOCKED, citizen.getStatus());
        verify(reputationLogRepository).save(any(ReputationLog.class));
    }

    @Test
    void fakeNewsRequiresReasonAndDoesNotChangeSubmission() {
        Submission submission = submission(user(90));
        when(submissionRepository.findForReviewByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));

        AppException error = assertThrows(AppException.class, () -> service.reviewSubmission("KB-2026-0001",
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.FAKE_NEWS, "Sai tin")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals(SubmissionStatus.PENDING, submission.getStatus());
        verify(reputationLogRepository, org.mockito.Mockito.never()).save(any(ReputationLog.class));
    }

    @Test
    void reviewCannotAwardOrDeductTwice() {
        Submission submission = submission(user(100));
        when(submissionRepository.findForReviewByTrackingCode("KB-2026-0001"))
                .thenReturn(java.util.Optional.of(submission));
        when(reputationLogRepository.existsByContributionTypeAndContributionId(
                eq(ReputationLog.ContributionType.CITIZEN_SUBMISSION), eq(1L))).thenReturn(true);

        AppException error = assertThrows(AppException.class, () -> service.reviewSubmission("KB-2026-0001",
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.APPROVE, null)));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals(100, submission.getAuthor().getReputationScore());
        assertEquals(SubmissionStatus.PENDING, submission.getStatus());
    }

    @Test
    void approvingExpertResearchAwardsTenPointsAndRecordsTheEditor() {
        User expert = expert(90);
        User editor = User.builder().id("ED0001").role(User.Role.EDITOR).status(User.Status.ACTIVE).build();
        ResearchArticle article = researchArticle(expert);
        when(researchArticleRepository.findForReputationReviewById(1L))
                .thenReturn(java.util.Optional.of(article));
        when(userRepository.getActiveById("ED0001")).thenReturn(editor);

        var result = service.reviewResearch("ED0001", 1L,
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.APPROVE, null));

        assertEquals(10, result.pointsChange());
        assertEquals(100, result.reputationScore());
        assertEquals(ResearchArticle.Status.APPROVED, article.getStatus());
        assertEquals(editor, article.getApprovedBy());
        verify(reputationLogRepository).save(any(ReputationLog.class));
    }

    @Test
    void fakeExpertResearchRequiresReasonAndRejectsTheArticle() {
        User expert = expert(85);
        ResearchArticle article = researchArticle(expert);
        when(researchArticleRepository.findForReputationReviewById(1L))
                .thenReturn(java.util.Optional.of(article));
        when(userRepository.getActiveById("ED0001")).thenReturn(
                User.builder().id("ED0001").role(User.Role.EDITOR).status(User.Status.ACTIVE).build());

        var result = service.reviewResearch("ED0001", 1L,
                new ReviewSubmissionRequest(ReviewSubmissionRequest.Decision.FAKE_NEWS,
                        "Nội dung có thông tin sai đã được xác minh."));

        assertEquals(-10, result.pointsChange());
        assertEquals(75, result.reputationScore());
        assertEquals(User.Status.LOCKED, result.accountStatus());
        assertEquals(ResearchArticle.Status.REJECTED, article.getStatus());
        assertEquals("Nội dung có thông tin sai đã được xác minh.", article.getEditorialNote());
    }

    private static User user(int score) {
        return User.builder()
                .id("CT0001")
                .role(User.Role.CITIZEN)
                .status(User.Status.ACTIVE)
                .reputationScore(score)
                .build();
    }

    private static Submission submission(User author) {
        Submission submission = Submission.builder()
                .trackingCode("KB-2026-0001")
                .author(author)
                .status(SubmissionStatus.PENDING)
                .build();
        submission.setId(1L);
        return submission;
    }

    private static User expert(int score) {
        return User.builder()
                .id("EX0001")
                .role(User.Role.EXPERT)
                .status(User.Status.ACTIVE)
                .reputationScore(score)
                .fullName("Expert")
                .email("expert@example.com")
                .build();
    }

    private static ResearchArticle researchArticle(User author) {
        ResearchArticle article = ResearchArticle.builder()
                .author(author)
                .status(ResearchArticle.Status.SUBMITTED)
                .title("Bài nghiên cứu")
                .build();
        article.setId(1L);
        return article;
    }
}
