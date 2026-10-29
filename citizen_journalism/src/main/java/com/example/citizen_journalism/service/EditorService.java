package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.EditorOverview;
import com.example.citizen_journalism.dto.editor.EditorSubmissionDetail;
import com.example.citizen_journalism.dto.editor.EditorSubmissionSummary;
import com.example.citizen_journalism.dto.editor.ReputationAccountSummary;
import com.example.citizen_journalism.dto.editor.ReputationResearchItem;
import com.example.citizen_journalism.dto.editor.ReputationResearchDetail;
import com.example.citizen_journalism.dto.editor.ReputationReviewResult;
import com.example.citizen_journalism.dto.editor.ReputationSubmissionItem;
import com.example.citizen_journalism.dto.editor.ReviewSubmissionRequest;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.editor.ResearchReviewDetail;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.Paging;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BÀN LÀM VIỆC CỦA BIÊN TẬP VIÊN (EditorController, frontend /editor/...).
 *
 * Hiện có: số liệu trang Tổng quan, hàng đợi chỉ xem hồ sơ và trang chấm điểm uy tín.
 * Mọi thay đổi trạng thái hồ sơ dùng SubmissionEventService để người gửi theo dõi được.
 * Phần đơn đăng ký CTV nằm ở ContributorApplicationService.
 */
@Service
@RequiredArgsConstructor
public class EditorService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionTrackingService trackingService;
    private final ContributorApplicationService applicationService;
    private final ReputationLogRepository reputationLogRepository;
    private final SubmissionEventService submissionEventService;
    private final UserRepository userRepository;
    private final ResearchArticleRepository researchArticleRepository;

    @Transactional(readOnly = true)
    public EditorOverview getOverview() {
        PageRequest latest = PageRequest.of(0, 5, Paging.NEWEST_FIRST); // 5 hồ sơ chờ tiếp nhận mới nhất
        return new EditorOverview(
                submissionRepository.countByTypeAndStatus(Submission.SubmissionType.HOT_NEWS, SubmissionStatus.PENDING),
                submissionRepository.countByTypeAndStatus(Submission.SubmissionType.COMPLAINT, SubmissionStatus.PENDING),
                submissionRepository.countByStatus(SubmissionStatus.IN_REVIEW),
                submissionRepository.countByStatus(SubmissionStatus.NEED_MORE_INFO),
                applicationService.countPendingForEditor(),
                submissionRepository.searchForStaff(SubmissionStatus.PENDING, null, latest)
                        .map(EditorSubmissionSummary::from).getContent(),
                applicationService.latestPending(5));
    }

    /**
     * Hàng đợi tin bài. Chờ tiếp nhận (PENDING): cũ nhất trước, để tin gửi trước được xử lý trước;
     * các trường hợp khác: mới nhất trước. status / category = null nghĩa là không lọc.
     */
    @Transactional(readOnly = true)
    public PageResponse<EditorSubmissionSummary> listSubmissions(SubmissionStatus status,
                                                                  Submission.ReportCategory category,
                                                                  int page, int size) {
        Sort sort = status == SubmissionStatus.PENDING ? Paging.OLDEST_FIRST : Paging.NEWEST_FIRST;
        return PageResponse.from(submissionRepository.searchForStaff(status, category, Paging.of(page, size, sort))
                .map(EditorSubmissionSummary::from));
    }

    @Transactional(readOnly = true)
    public EditorSubmissionDetail getSubmission(String trackingCode) {
        String normalizedCode = trackingCode.trim().toUpperCase(java.util.Locale.ROOT);
        Submission submission = submissionRepository.findByTrackingCode(normalizedCode)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
        return new EditorSubmissionDetail(
                trackingService.getForStaff(normalizedCode), submission.getAuthor().getRole(),
                reputationLogRepository.existsByContributionTypeAndContributionId(
                        ReputationLog.ContributionType.CITIZEN_SUBMISSION, submission.getId()));
    }

    @Transactional
    public ReputationReviewResult<EditorSubmissionDetail> reviewSubmission(
            String trackingCode, ReviewSubmissionRequest request) {
        String normalizedCode = trackingCode.trim().toUpperCase(java.util.Locale.ROOT);
        Submission submission = submissionRepository.findForReviewByTrackingCode(normalizedCode)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));

        User author = submission.getAuthor();
        requireReputationRole(author);
        int pointsChange;
        if (request.decision() == ReviewSubmissionRequest.Decision.FAKE_NEWS) {
            String reason = request.reason() == null ? "" : request.reason().trim();
            if (reason.length() < 10) {
                throw AppException.invalidFields(java.util.Map.of(
                        "reason", "Vui lòng ghi lý do tin giả, ít nhất 10 ký tự."));
            }
            pointsChange = adjustReputation(author, -10,
                    ReputationLog.ContributionType.CITIZEN_SUBMISSION, submission.getId(),
                    ReputationLog.ReputationReason.CITIZEN_SUBMISSION_FAKE_NEWS, submission);
            if (submission.getStatus() != SubmissionStatus.RETRACTED) {
                submissionEventService.record(submission, SubmissionStatus.RETRACTED,
                        SubmissionEvent.Actor.EDITOR,
                        "Hồ sơ bị từ chối vì tin giả và đã được gỡ bỏ.", reason);
            }
        } else {
            pointsChange = adjustReputation(author, 5,
                    ReputationLog.ContributionType.CITIZEN_SUBMISSION, submission.getId(),
                    author.getRole() == User.Role.CITIZEN
                            ? ReputationLog.ReputationReason.CITIZEN_SUBMISSION_PUBLISHED
                            : ReputationLog.ReputationReason.EDITOR_APPROVED_SUBMISSION,
                    submission);
            if (submission.getStatus() == SubmissionStatus.PENDING) {
                submissionEventService.record(submission, SubmissionStatus.PUBLISHED,
                        SubmissionEvent.Actor.EDITOR,
                        "Tin đã được Biên tập viên xác minh là tin chuẩn và chấp thuận đăng tải.", null);
            }
        }
        return new ReputationReviewResult<>(getSubmission(normalizedCode), pointsChange,
                author.getReputationScore(), author.getStatus());
    }

    private int adjustReputation(User user, int requestedPoints, ReputationLog.ContributionType type,
                                 Long contributionId, ReputationLog.ReputationReason reason,
                                 Submission submission) {
        if (reputationLogRepository.existsByContributionTypeAndContributionId(type, contributionId)) {
            throw AppException.conflict("Điểm uy tín cho bài viết này đã được xử lý.");
        }
        int appliedPoints = requestedPoints > 0
                ? user.applyReputationAward(requestedPoints)
                : applyReputationDeduction(user, requestedPoints);
        user.lockIfBelowMinimumReputation();
        reputationLogRepository.save(ReputationLog.builder()
                .user(user)
                .pointsChange(appliedPoints)
                .reason(reason)
                .relatedSubmission(submission)
                .contributionType(type)
                .contributionId(contributionId)
                .build());
        return appliedPoints;
    }

    @Transactional(readOnly = true)
    public PageResponse<ReputationAccountSummary> listReputationAccounts(User.Role role, String keyword,
                                                                         int page, int size) {
        if (role != User.Role.CITIZEN && role != User.Role.EXPERT) {
            throw AppException.badRequest("Chỉ hỗ trợ tài khoản Citizen và Expert.");
        }
        return PageResponse.from(userRepository.search(keyword == null || keyword.isBlank() ? null : keyword.trim(),
                role, null, Paging.of(page, size, Sort.by(Sort.Order.asc("id"))))
                .map(ReputationAccountSummary::from));
    }

    @Transactional(readOnly = true)
    public ReputationAccountSummary getReputationAccount(String accountId) {
        return ReputationAccountSummary.from(findReputationAccount(accountId));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReputationSubmissionItem> listReputationSubmissions(String accountId, int page, int size) {
        findReputationAccount(accountId);
        return PageResponse.from(submissionRepository.findByAuthorId(accountId,
                Paging.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))))
                .map(submission -> ReputationSubmissionItem.from(submission,
                        reputationLogRepository.existsByContributionTypeAndContributionId(
                                ReputationLog.ContributionType.CITIZEN_SUBMISSION, submission.getId()))));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReputationResearchItem> listReputationResearch(String accountId, int page, int size) {
        User account = findReputationAccount(accountId);
        if (account.getRole() != User.Role.EXPERT) {
            throw AppException.badRequest("Tài khoản này không có bài nghiên cứu Expert.");
        }
        return PageResponse.from(researchArticleRepository.findByAuthorIdAndStatusIn(accountId,
                java.util.List.of(ResearchArticle.Status.SUBMITTED, ResearchArticle.Status.APPROVED,
                        ResearchArticle.Status.REJECTED),
                Paging.of(page, size, Sort.by(Sort.Order.desc("submittedAt"), Sort.Order.desc("id"))))
                .map(article -> ReputationResearchItem.from(article,
                        reputationLogRepository.existsByContributionTypeAndContributionId(
                                ReputationLog.ContributionType.EXPERT_RESEARCH_ARTICLE, article.getId()))));
    }

    @Transactional(readOnly = true)
    public ReputationResearchDetail getReputationResearch(Long articleId) {
        ResearchArticle article = researchArticleRepository.findWithReviewDetailsById(articleId)
                .filter(value -> value.getAuthor().getRole() == User.Role.EXPERT)
                .filter(value -> value.getStatus() != ResearchArticle.Status.DRAFT)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy bài nghiên cứu đã nộp."));
        return new ReputationResearchDetail(ResearchReviewDetail.from(article),
                reputationLogRepository.existsByContributionTypeAndContributionId(
                                ReputationLog.ContributionType.EXPERT_RESEARCH_ARTICLE, articleId));
    }

    @Transactional
    public ReputationReviewResult<ResearchReviewDetail> reviewResearch(String editorId, Long articleId,
                                                                      ReviewSubmissionRequest request) {
        ResearchArticle article = researchArticleRepository.findForReputationReviewById(articleId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy bài nghiên cứu."));
        User editor = userRepository.getActiveById(editorId);
        User author = article.getAuthor();
        if (author.getRole() != User.Role.EXPERT || article.getStatus() == ResearchArticle.Status.DRAFT) {
            throw AppException.notFound("Không tìm thấy bài nghiên cứu đã nộp.");
        }
        int pointsChange;
        if (request.decision() == ReviewSubmissionRequest.Decision.FAKE_NEWS) {
            String reason = request.reason() == null ? "" : request.reason().trim();
            if (reason.length() < 10) {
                throw AppException.invalidFields(java.util.Map.of(
                        "reason", "Vui lòng ghi lý do tin giả, ít nhất 10 ký tự."));
            }
            pointsChange = adjustReputation(author, -10,
                    ReputationLog.ContributionType.EXPERT_RESEARCH_ARTICLE, article.getId(),
                    ReputationLog.ReputationReason.EXPERT_ARTICLE_FAKE_NEWS, null);
            article.setEditorialNote(reason);
            article.setStatus(ResearchArticle.Status.REJECTED);
        } else {
            pointsChange = adjustReputation(author, 10,
                    ReputationLog.ContributionType.EXPERT_RESEARCH_ARTICLE, article.getId(),
                    ReputationLog.ReputationReason.EXPERT_RESEARCH_APPROVED, null);
            article.setStatus(ResearchArticle.Status.APPROVED);
            article.setApprovedBy(editor);
            article.setApprovedAt(java.time.LocalDateTime.now());
            article.setEditorialNote(null);
        }
        return new ReputationReviewResult<>(ResearchReviewDetail.from(article), pointsChange,
                author.getReputationScore(), author.getStatus());
    }

    private User findReputationAccount(String accountId) {
        User user = userRepository.findById(accountId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản."));
        requireReputationRole(user);
        return user;
    }

    private static void requireReputationRole(User user) {
        if (user.getRole() != User.Role.CITIZEN && user.getRole() != User.Role.EXPERT) {
            throw AppException.notFound("Không tìm thấy tài khoản Citizen hoặc Expert.");
        }
    }

    private static int applyReputationDeduction(User author, int pointsChange) {
        int currentScore = author.getReputationScore() == null
                ? User.DEFAULT_REPUTATION_SCORE : author.getReputationScore();
        int boundedCurrentScore = Math.max(0, Math.min(currentScore, User.MAX_REPUTATION_SCORE));
        int updatedScore = Math.max(0, boundedCurrentScore + pointsChange);
        author.setReputationScore(updatedScore);
        return updatedScore - boundedCurrentScore;
    }
}
