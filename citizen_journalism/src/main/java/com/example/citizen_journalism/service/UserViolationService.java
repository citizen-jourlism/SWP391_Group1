package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.violation.ApproveViolationRequest;
import com.example.citizen_journalism.dto.violation.CreateViolationRequest;
import com.example.citizen_journalism.dto.violation.ReviewViolationRequest;
import com.example.citizen_journalism.dto.violation.ViolationDetail;
import com.example.citizen_journalism.dto.violation.ViolationSummary;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.UserViolation;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.exception.ErrorCode;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.repository.UserViolationRepository;
import com.example.citizen_journalism.util.Paging;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserViolationService {

    private final UserViolationRepository violationRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final ReputationLogRepository reputationLogRepository;
    private final SubmissionEventService submissionEventService;
    private final MailService mailService;

    @Transactional(readOnly = true)
    public PageResponse<ViolationSummary> list(UserViolation.Status status, UserViolation.Type type,
                                               UserViolation.Action action,
                                               String keyword, int page, int size) {
        return PageResponse.from(violationRepository.search(status, type, action, blankToNull(keyword),
                Paging.of(page, size, Paging.NEWEST_FIRST)).map(ViolationSummary::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<ViolationSummary> listForLeadership(UserViolation.Status status,
                                                            UserViolation.Action action,
                                                            String keyword, int page, int size) {
        boolean includePendingReview = status == UserViolation.Status.PENDING_APPROVAL;
        return PageResponse.from(violationRepository.searchForLeadershipApprovals(
                status, includePendingReview, UserViolation.Status.PENDING_REVIEW, action,
                blankToNull(keyword), Paging.of(page, size, Paging.NEWEST_FIRST)).map(ViolationSummary::from));
    }

    @Transactional(readOnly = true)
    public ViolationDetail get(Long id) {
        UserViolation violation = find(id);
        return ViolationDetail.from(violation,
                reputationLogRepository.findTop20ByUserIdOrderByCreatedAtDesc(violation.getReportedUser().getId()));
    }

    @Transactional
    public ViolationDetail create(String editorId, CreateViolationRequest request) {
        User editor = userRepository.getActiveById(editorId);
        User subject = userRepository.findById(request.userId().trim().toUpperCase())
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản " + request.userId() + "."));
        if (subject.getRole() == User.Role.SYSTEM_ADMIN) {
            throw AppException.badRequest("Không thể lập báo cáo vi phạm cho tài khoản quản trị hệ thống.");
        }

        Submission submission = null;
        String trackingCode = blankToNull(request.trackingCode());
        if (trackingCode != null) {
            submission = submissionRepository.findByTrackingCode(trackingCode.toUpperCase())
                    .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ " + trackingCode + "."));
            if (!submission.getAuthor().getId().equals(subject.getId())) {
                throw AppException.badRequest("Hồ sơ này không thuộc tài khoản bị báo cáo.");
            }
        }

        UserViolation violation = violationRepository.save(UserViolation.builder()
                .reportedUser(subject)
                .relatedSubmission(submission)
                .reportedBy(editor)
                .type(request.type())
                .severity(request.severity())
                .description(request.description().trim())
                .evidenceNote(blankToNull(request.evidenceNote()))
                .status(UserViolation.Status.PENDING_APPROVAL)
                .build());
        return ViolationDetail.from(violation);
    }

    @Transactional
    public ViolationDetail review(String editorId, Long id, ReviewViolationRequest request) {
        UserViolation violation = find(id);
        if (violation.getStatus() != UserViolation.Status.PENDING_REVIEW) {
            throw AppException.conflict("Báo cáo này đã được xử lý.");
        }
        User editor = userRepository.getActiveById(editorId);
        String note = blankToNull(request.note());
        violation.setReviewedBy(editor);
        violation.setReviewNote(note);
        violation.setReviewedAt(LocalDateTime.now());

        if (request.decision() == ReviewViolationRequest.Decision.DISMISS) {
            if (note == null || note.length() < 10) {
                throw AppException.invalidFields(Map.of("note", "Vui lòng ghi lý do bỏ qua, ít nhất 10 ký tự."));
            }
            violation.setStatus(UserViolation.Status.DISMISSED);
            return ViolationDetail.from(violation);
        }

        UserViolation.Action action = request.action();
        if (action == null) {
            throw AppException.invalidFields(Map.of("action", "Vui lòng chọn biện pháp xử lý."));
        }
        if (action == UserViolation.Action.WARNING && (note == null || note.length() < 5)) {
            throw AppException.invalidFields(Map.of("note", "Vui lòng nhập nội dung cảnh báo, tối thiểu 5 ký tự."));
        }
        validateAction(violation, action, request.points());
        if (request.decision() == ReviewViolationRequest.Decision.HANDLE
                && requiresApproval(action) && action != UserViolation.Action.LOCK_ACCOUNT) {
            String approver = action == UserViolation.Action.LOCK_ACCOUNT
                    ? "Phó Tổng biên tập"
                    : "lãnh đạo";
            throw AppException.badRequest("Biện pháp này phải được trình " + approver + " phê duyệt.");
        }
        if (request.decision() == ReviewViolationRequest.Decision.ESCALATE && !requiresApproval(action)) {
            throw AppException.badRequest("Chỉ có thể chuyển cấp trên các đề xuất khóa/mở khóa hoặc gỡ nội dung.");
        }
        if (action == UserViolation.Action.RETRACT_CONTENT) {
            if (note == null || note.length() < 20) {
                throw AppException.invalidFields(Map.of("note", "Căn cứ pháp lý gỡ bài cần ít nhất 20 ký tự."));
            }
            violation.setRetractionSnapshot(violation.getRelatedSubmission().getContent());
        }
        violation.setProposedAction(action);

        if (action == UserViolation.Action.LOCK_ACCOUNT) {
            violation.setStatus(UserViolation.Status.PENDING_APPROVAL);
            return ViolationDetail.from(violation);
        }

        if (requiresApproval(action) || request.decision() == ReviewViolationRequest.Decision.ESCALATE) {
            violation.setStatus(UserViolation.Status.PENDING_APPROVAL);
        } else {
            applyDirectAction(violation, action, request.points());
            violation.setStatus(UserViolation.Status.RESOLVED);
            notifyResult(violation, "Báo cáo vi phạm đã được xử lý",
                    action == UserViolation.Action.WARNING ? note : null);
        }
        return ViolationDetail.from(violation);
    }

    @Transactional
    public ViolationDetail approve(String adminId, Long id, ApproveViolationRequest request) {
        UserViolation violation = find(id);
        if (violation.getStatus() != UserViolation.Status.PENDING_APPROVAL
                && violation.getStatus() != UserViolation.Status.PENDING_REVIEW) {
            throw AppException.conflict("Yêu cầu này không còn chờ phê duyệt.");
        }
        User admin = userRepository.getActiveById(adminId);
        UserViolation.Action action = violation.getProposedAction();
        if (request.decision() == ApproveViolationRequest.Decision.APPROVE) {
            if (action == null) {
                action = request.action();
                if (action == null) {
                    throw AppException.invalidFields(Map.of("action", "Vui lòng chọn khóa tài khoản hoặc gỡ nội dung."));
                }
                validateAction(violation, action, null);
                if (action == UserViolation.Action.RETRACT_CONTENT) {
                    violation.setRetractionSnapshot(violation.getRelatedSubmission().getContent());
                }
                violation.setProposedAction(action);
            }
            if (action == UserViolation.Action.LOCK_ACCOUNT && admin.getRole() != User.Role.DEPUTY_EIC) {
                throw AppException.forbidden("Chỉ Phó Tổng biên tập được phê duyệt khóa tài khoản.", ErrorCode.FORBIDDEN);
            }
        }
        String note = blankToNull(request.note());
        violation.setApprovedBy(admin);
        violation.setApprovalNote(note);
        violation.setApprovedAt(LocalDateTime.now());

        if (request.decision() == ApproveViolationRequest.Decision.REJECT) {
            if (note == null || note.length() < 10) {
                throw AppException.invalidFields(Map.of("note", "Vui lòng ghi lý do từ chối, ít nhất 10 ký tự."));
            }
            violation.setStatus(UserViolation.Status.REJECTED);
        } else {
            applyApprovedAction(violation);
            violation.setStatus(UserViolation.Status.RESOLVED);
            notifyResult(violation, "Quyết định xử lý vi phạm đã được phê duyệt", note);
        }
        return ViolationDetail.from(violation);
    }

    public long pendingApprovalCount() {
        return violationRepository.countByStatus(UserViolation.Status.PENDING_APPROVAL);
    }

    private void validateAction(UserViolation violation, UserViolation.Action action, Integer points) {
        User user = violation.getReportedUser();
        switch (action) {
            case DEDUCT_POINTS -> {
                if (points == null || points < 1 || points > 100) {
                    throw AppException.invalidFields(Map.of("points", "Nhập số điểm cần trừ từ 1 đến 100."));
                }
                if (user.getReputationScore() - points < User.MIN_REPUTATION_SCORE) {
                    throw AppException.badRequest(
                            "Biên tập viên không thể trừ điểm khiến tài khoản bị khóa; hãy trình đề xuất để Phó Tổng biên tập phê duyệt.");
                }
            }
            case LOCK_ACCOUNT -> {
                if (user.getStatus() != User.Status.ACTIVE) {
                    throw AppException.badRequest("Chỉ có thể đề xuất khoá tài khoản đang hoạt động.");
                }
            }
            case UNLOCK_ACCOUNT -> {
                if (user.getStatus() != User.Status.LOCKED) {
                    throw AppException.badRequest("Chỉ có thể đề xuất mở tài khoản đang bị khoá.");
                }
            }
            case RETRACT_CONTENT -> {
                if (violation.getRelatedSubmission() == null) {
                    throw AppException.invalidFields(Map.of("action", "Gỡ nội dung cần có hồ sơ liên quan."));
                }
                Submission.SubmissionStatus status = violation.getRelatedSubmission().getStatus();
                if (status != Submission.SubmissionStatus.PUBLISHED
                        && status != Submission.SubmissionStatus.CORRECTED
                        && status != Submission.SubmissionStatus.READY_FOR_PUBLISHING) {
                    throw AppException.badRequest("Chỉ có thể đề xuất gỡ nội dung đã duyệt hoặc đã đăng.");
                }
            }
            default -> {
            }
        }
    }

    private static boolean requiresApproval(UserViolation.Action action) {
        return action == UserViolation.Action.LOCK_ACCOUNT
                || action == UserViolation.Action.UNLOCK_ACCOUNT
                || action == UserViolation.Action.RETRACT_CONTENT;
    }

    private void applyDirectAction(UserViolation violation, UserViolation.Action action, Integer points) {
        if (action == UserViolation.Action.DEDUCT_POINTS) {
            User user = violation.getReportedUser();
            int deduction = points == null ? 0 : points;
            user.setReputationScore(Math.max(0, user.getReputationScore() - deduction));
            user.lockIfBelowMinimumReputation();
            violation.setPointsDeducted(deduction);
            reputationLogRepository.save(ReputationLog.builder()
                    .user(user)
                    .pointsChange(-deduction)
                    .reason(reasonOf(violation.getType()))
                    .relatedSubmission(violation.getRelatedSubmission())
                    .build());
        }
    }

    private void applyApprovedAction(UserViolation violation) {
        User user = violation.getReportedUser();
        switch (violation.getProposedAction()) {
            case LOCK_ACCOUNT -> user.setStatus(User.Status.LOCKED);
            case UNLOCK_ACCOUNT -> {
                if (user.hasBelowMinimumReputation()) {
                    throw AppException.badRequest("Tài khoản phải có ít nhất 80 điểm uy tín mới được mở khóa.");
                }
                user.setStatus(User.Status.ACTIVE);
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
            }
            case RETRACT_CONTENT -> submissionEventService.record(violation.getRelatedSubmission(),
                    Submission.SubmissionStatus.RETRACTED, SubmissionEvent.Actor.SYSTEM,
                    "Nội dung đã được gỡ sau khi phê duyệt báo cáo vi phạm.", violation.getApprovalNote());
            default -> throw AppException.badRequest("Biện pháp này không cần phê duyệt.");
        }
    }

    private static ReputationLog.ReputationReason reasonOf(UserViolation.Type type) {
        return switch (type) {
            case COPYRIGHT_VIOLATION -> ReputationLog.ReputationReason.COPYRIGHT_VIOLATION;
            case INACCURATE_EVIDENCE, FALSE_INFORMATION -> ReputationLog.ReputationReason.INACCURATE_EVIDENCE;
            default -> ReputationLog.ReputationReason.SPAM_REPORTED;
        };
    }

    private void notifyResult(UserViolation violation, String subject, String message) {
        User user = violation.getReportedUser();
        String action = violation.getProposedAction() == null ? "Không áp dụng biện pháp" : violation.getProposedAction().name();
        mailService.trySend(user.getEmail(), "[Tin Nóng Dân Sinh] " + subject,
                MailService.layout("<p>Xin chào <b>" + MailService.escape(user.getFullName()) + "</b>,</p>"
                        + "<p>Tài khoản của bạn có cập nhật xử lý vi phạm: <b>" + action + "</b>.</p>"
                        + (message == null ? "" : "<p>" + MailService.escape(message) + "</p>")
                        + "<p>Nếu cần hỗ trợ, vui lòng liên hệ Ban biên tập.</p>"));
    }

    private UserViolation find(Long id) {
        return violationRepository.findWithDetailsById(id)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy báo cáo vi phạm."));
    }
}
