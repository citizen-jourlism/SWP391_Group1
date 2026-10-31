package com.example.citizen_journalism.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.citizen_journalism.dto.violation.ApproveViolationRequest;
import com.example.citizen_journalism.dto.violation.CreateViolationRequest;
import com.example.citizen_journalism.dto.violation.ReviewViolationRequest;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.UserViolation;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.repository.UserViolationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

class UserViolationServiceTest {

    private final UserViolationRepository violationRepository = mock(UserViolationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SubmissionEventService submissionEventService = mock(SubmissionEventService.class);
    private final UserViolationService service = new UserViolationService(
            violationRepository,
            userRepository,
            mock(SubmissionRepository.class),
            mock(ReputationLogRepository.class),
            submissionEventService,
            mock(MailService.class));

    @Test
    void creatingEditorViolationSendsItDirectlyToLeadershipApprovalQueue() {
        User editor = user("ED0001", User.Role.EDITOR, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        when(userRepository.getActiveById(editor.getId())).thenReturn(editor);
        when(userRepository.findById(subject.getId())).thenReturn(java.util.Optional.of(subject));
        when(violationRepository.save(any(UserViolation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var created = service.create(editor.getId(), new CreateViolationRequest(
                subject.getId(), null, UserViolation.Type.POLICY_VIOLATION, UserViolation.Severity.HIGH,
                "A sufficiently detailed violation description.", null));

        assertEquals(UserViolation.Status.PENDING_APPROVAL, created.status());
        assertEquals(User.Status.ACTIVE, subject.getStatus());
    }

    @Test
    void leadershipPendingApprovalQueueAlsoIncludesExistingPendingReviewReports() {
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation legacyReport = violation(subject, UserViolation.Status.PENDING_REVIEW, null);
        when(violationRepository.searchForLeadershipApprovals(
                eq(UserViolation.Status.PENDING_APPROVAL), eq(true), eq(UserViolation.Status.PENDING_REVIEW),
                isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(java.util.List.of(legacyReport)));

        var approvals = service.listForLeadership(UserViolation.Status.PENDING_APPROVAL, null, null, 0, 10);

        assertEquals(1, approvals.totalItems());
        assertEquals(UserViolation.Status.PENDING_REVIEW, approvals.items().get(0).status());
    }

    @Test
    void editorLockRequestAlwaysWaitsForApprovalEvenWhenClientSendsHandle() {
        User editor = user("ED0001", User.Role.EDITOR, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_REVIEW, null);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(editor.getId())).thenReturn(editor);

        service.review(editor.getId(), 1L, new ReviewViolationRequest(
                ReviewViolationRequest.Decision.HANDLE, UserViolation.Action.LOCK_ACCOUNT, null, null));

        assertEquals(User.Status.ACTIVE, subject.getStatus());
        assertEquals(UserViolation.Status.PENDING_APPROVAL, violation.getStatus());
        assertEquals(UserViolation.Action.LOCK_ACCOUNT, violation.getProposedAction());

        when(violationRepository.search(eq(UserViolation.Status.PENDING_APPROVAL), isNull(), isNull(),
                isNull(), any(Pageable.class))).thenReturn(new PageImpl<>(java.util.List.of(violation)));
        var approvals = service.list(UserViolation.Status.PENDING_APPROVAL, null, null, null, 0, 10);
        assertEquals(1, approvals.totalItems());
        assertEquals(UserViolation.Status.PENDING_APPROVAL, approvals.items().get(0).status());
        assertEquals(UserViolation.Action.LOCK_ACCOUNT, approvals.items().get(0).proposedAction());
    }

    @Test
    void editorCanSubmitAccountLockForApprovalWithoutApplyingIt() {
        User editor = user("ED0001", User.Role.EDITOR, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_REVIEW, null);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(editor.getId())).thenReturn(editor);

        service.review(editor.getId(), 1L, new ReviewViolationRequest(
                ReviewViolationRequest.Decision.ESCALATE, UserViolation.Action.LOCK_ACCOUNT, null, null));

        assertEquals(User.Status.ACTIVE, subject.getStatus());
        assertEquals(UserViolation.Status.PENDING_APPROVAL, violation.getStatus());
        assertEquals(UserViolation.Action.LOCK_ACCOUNT, violation.getProposedAction());
    }

    @Test
    void onlyDeputyEicCanApproveAccountLock() {
        User eic = user("EC0001", User.Role.EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_APPROVAL,
                UserViolation.Action.LOCK_ACCOUNT);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(eic.getId())).thenReturn(eic);

        AppException error = assertThrows(AppException.class,
                () -> service.approve(eic.getId(), 1L, new ApproveViolationRequest(
                        ApproveViolationRequest.Decision.APPROVE, null, null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals(User.Status.ACTIVE, subject.getStatus());
        assertEquals(UserViolation.Status.PENDING_APPROVAL, violation.getStatus());
    }

    @Test
    void deputyEicCanApproveAccountLock() {
        User deputy = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_APPROVAL,
                UserViolation.Action.LOCK_ACCOUNT);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(deputy.getId())).thenReturn(deputy);

        service.approve(deputy.getId(), 1L, new ApproveViolationRequest(
                ApproveViolationRequest.Decision.APPROVE, null, null));

        assertEquals(User.Status.LOCKED, subject.getStatus());
        assertEquals(UserViolation.Status.RESOLVED, violation.getStatus());
    }

    @Test
    void deputyCanApproveLockRequestSubmittedWithoutProposedAction() {
        User deputy = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_APPROVAL, null);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(deputy.getId())).thenReturn(deputy);

        service.approve(deputy.getId(), 1L, new ApproveViolationRequest(
                ApproveViolationRequest.Decision.APPROVE, UserViolation.Action.LOCK_ACCOUNT, null));

        assertEquals(User.Status.LOCKED, subject.getStatus());
        assertEquals(UserViolation.Action.LOCK_ACCOUNT, violation.getProposedAction());
        assertEquals(UserViolation.Status.RESOLVED, violation.getStatus());
    }

    @Test
    void leadershipCanApproveExistingPendingReviewReport() {
        User deputy = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation legacyReport = violation(subject, UserViolation.Status.PENDING_REVIEW, null);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(legacyReport));
        when(userRepository.getActiveById(deputy.getId())).thenReturn(deputy);

        service.approve(deputy.getId(), 1L, new ApproveViolationRequest(
                ApproveViolationRequest.Decision.APPROVE, UserViolation.Action.LOCK_ACCOUNT, null));

        assertEquals(User.Status.LOCKED, subject.getStatus());
        assertEquals(UserViolation.Status.RESOLVED, legacyReport.getStatus());
    }

    @Test
    void approvingRetractionRemovesRelatedSubmission() {
        User leader = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        Submission submission = Submission.builder()
                .author(subject)
                .trackingCode("KB-2026-0001")
                .title("Published report")
                .content("Published report contents")
                .status(Submission.SubmissionStatus.PUBLISHED)
                .build();
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_APPROVAL, null);
        violation.setRelatedSubmission(submission);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(leader.getId())).thenReturn(leader);

        service.approve(leader.getId(), 1L, new ApproveViolationRequest(
                ApproveViolationRequest.Decision.APPROVE, UserViolation.Action.RETRACT_CONTENT, null));

        assertEquals(User.Status.ACTIVE, subject.getStatus());
        assertEquals(UserViolation.Status.RESOLVED, violation.getStatus());
        assertEquals("Published report contents", violation.getRetractionSnapshot());
        verify(submissionEventService).record(submission, Submission.SubmissionStatus.RETRACTED,
                SubmissionEvent.Actor.SYSTEM, "Nội dung đã được gỡ sau khi phê duyệt báo cáo vi phạm.", null);
    }

    @Test
    void rejectingLockRequestLeavesAccountActive() {
        User leader = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_APPROVAL,
                UserViolation.Action.LOCK_ACCOUNT);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(leader.getId())).thenReturn(leader);

        service.approve(leader.getId(), 1L, new ApproveViolationRequest(
                ApproveViolationRequest.Decision.REJECT, null, "Insufficient evidence"));

        assertEquals(User.Status.ACTIVE, subject.getStatus());
        assertEquals(UserViolation.Status.REJECTED, violation.getStatus());
    }

    @Test
    void rejectingRetractionLeavesRelatedSubmissionPublished() {
        User leader = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 100);
        Submission submission = Submission.builder()
                .author(subject)
                .status(Submission.SubmissionStatus.PUBLISHED)
                .build();
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_APPROVAL,
                UserViolation.Action.RETRACT_CONTENT);
        violation.setRelatedSubmission(submission);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(leader.getId())).thenReturn(leader);

        service.approve(leader.getId(), 1L, new ApproveViolationRequest(
                ApproveViolationRequest.Decision.REJECT, null, "Insufficient evidence"));

        assertEquals(Submission.SubmissionStatus.PUBLISHED, submission.getStatus());
        assertEquals(UserViolation.Status.REJECTED, violation.getStatus());
        verify(submissionEventService, org.mockito.Mockito.never())
                .record(any(), any(), any(), any(), any());
    }

    @Test
    void editorCannotDeductReputationPointsToLockAccount() {
        User editor = user("ED0001", User.Role.EDITOR, User.Status.ACTIVE, 100);
        User subject = user("CT0001", User.Role.CITIZEN, User.Status.ACTIVE, 85);
        UserViolation violation = violation(subject, UserViolation.Status.PENDING_REVIEW, null);
        when(violationRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(violation));
        when(userRepository.getActiveById(editor.getId())).thenReturn(editor);

        assertThrows(AppException.class, () -> service.review(editor.getId(), 1L,
                new ReviewViolationRequest(ReviewViolationRequest.Decision.HANDLE,
                        UserViolation.Action.DEDUCT_POINTS, 10, null)));
        assertEquals(User.Status.ACTIVE, subject.getStatus());
        assertEquals(85, subject.getReputationScore());
    }

    private static User user(String id, User.Role role, User.Status status, int reputation) {
        return User.builder()
                .id(id)
                .role(role)
                .fullName("Test user")
                .email(id.toLowerCase() + "@example.com")
                .status(status)
                .reputationScore(reputation)
                .build();
    }

    private static UserViolation violation(User subject, UserViolation.Status status,
                                           UserViolation.Action proposedAction) {
        return UserViolation.builder()
                .reportedUser(subject)
                .reportedBy(user("ED0002", User.Role.EDITOR, User.Status.ACTIVE, 100))
                .type(UserViolation.Type.OTHER)
                .severity(UserViolation.Severity.HIGH)
                .description("Test violation")
                .status(status)
                .proposedAction(proposedAction)
                .build();
    }
}
