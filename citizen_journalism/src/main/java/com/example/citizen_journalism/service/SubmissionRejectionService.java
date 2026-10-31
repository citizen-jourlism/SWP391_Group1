package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.RejectReason;
import com.example.citizen_journalism.dto.editor.RejectSubmissionRequest;
import com.example.citizen_journalism.dto.editor.RejectSubmissionResponse;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EditorialReviewRepository;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TỪ CHỐI HỒ SƠ (Reject Submission) — Biên tập viên loại các hồ sơ không đạt yêu cầu, kèm phản hồi cho người gửi.
 * API: EditorController (GET /api/editor/submissions/{mã}/rejection, POST .../reject).
 * Frontend: routes/editor/EditorRejectSubmission.jsx; người gửi thấy hộp phản hồi ở trang theo dõi hồ sơ (RejectionCard).
 *
 * KHÔNG cần thêm cột mới. Khi từ chối, ghi:
 *   - submissions.status = REJECTED + 1 bước nhật ký (SubmissionEventService.record):
 *       description "Không tiếp nhận hồ sơ: <tên lý do>.", note = phản hồi gửi người gửi
 *   - editorial_reviews: review_role EDITOR, action REJECT, comments = "[MÃ LÝ DO] ghi chú nội bộ"
 *   - nhiệm vụ CTV còn hiệu lực được thu hồi và báo cho CTV (FieldAssignmentService.revokeActive)
 *   - lý do tin rác + có chọn trừ điểm + hồ sơ không ẩn danh: reputation_logs (-SPAM_PENALTY, SPAM_REPORTED)
 *     và giảm users.reputation_score (không xuống dưới 0)
 * Đọc lại lý do / phản hồi: SubmissionTrackingService.rejectionOf.
 */
@Service
@RequiredArgsConstructor
public class SubmissionRejectionService {

    /** Số điểm uy tín bị trừ khi hồ sơ bị từ chối vì tin rác. */
    public static final int SPAM_PENALTY = 10;

    /** Chỉ từ chối được hồ sơ còn ở bước biên tập; đã chuyển Phó TBT / TBT thì không. */
    private static final Set<SubmissionStatus> REJECTABLE_STATUSES =
            Set.of(SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW, SubmissionStatus.NEED_MORE_INFO);

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final EditorialReviewRepository reviewRepository;
    private final ReputationLogRepository reputationLogRepository;
    private final SubmissionEventService eventService;
    private final FieldAssignmentService fieldAssignmentService;
    private final SubmissionTrackingService trackingService;
    private final MailService mailService;

    /** Dữ liệu màn Từ chối hồ sơ: chi tiết hồ sơ, người gửi, sàng lọc AI, lần từ chối đã lưu (nếu có). */
    @Transactional(readOnly = true)
    public RejectSubmissionResponse getContext(String trackingCode) {
        return toContext(findSubmission(trackingCode));
    }

    @Transactional
    public RejectSubmissionResponse reject(String editorId, String trackingCode, RejectSubmissionRequest request) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        if (!REJECTABLE_STATUSES.contains(submission.getStatus())) {
            throw AppException.conflict("Hồ sơ đã qua bước biên tập hoặc đã được xử lý, không thể từ chối.");
        }

        RejectReason reason = request.reason();
        String feedback = request.feedback().trim();
        String internalNote = TextUtils.blankToNull(request.internalNote());

        eventService.record(submission, SubmissionStatus.REJECTED, SubmissionEvent.Actor.EDITOR,
                "Không tiếp nhận hồ sơ: " + reason.getLabel() + ".", feedback);
        // Hồ sơ đã đóng thì Cộng tác viên không cần đi xác minh nữa
        fieldAssignmentService.revokeActive(submission, editor, "Hồ sơ đã bị từ chối nên nhiệm vụ không còn cần thiết.");
        reviewRepository.save(EditoralReview.builder()
                .submission(submission)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(EditoralReview.ReviewAction.REJECT)
                .comments(internalNote == null ? "[" + reason.name() + "]" : "[" + reason.name() + "] " + internalNote)
                .build());

        boolean anonymous = Boolean.TRUE.equals(submission.getIsAnonymous());
        boolean penalize = reason == RejectReason.SPAM && request.applyPenalty() && !anonymous;
        if (penalize) {
            User author = submission.getAuthor();
            author.setReputationScore(Math.max(0, author.getReputationScore() - SPAM_PENALTY));
            reputationLogRepository.save(ReputationLog.builder()
                    .user(author)
                    .pointsChange(-SPAM_PENALTY)
                    .reason(ReputationLog.ReputationReason.SPAM_REPORTED)
                    .relatedSubmission(submission)
                    .build());
        }

        if (!anonymous) {
            notifyReporter(submission, reason, feedback, penalize);
        }
        return toContext(submission);
    }

    // ================================ HÀM PHỤ ================================

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    private RejectSubmissionResponse toContext(Submission submission) {
        SubmissionDetail detail = trackingService.getForStaff(submission.getTrackingCode());
        boolean spam = Boolean.TRUE.equals(submission.getIsSpam());
        RejectSubmissionResponse.Screening screening = new RejectSubmissionResponse.Screening(
                spam,
                submission.getAiSummary(),
                null,
                null,
                spam ? RejectReason.SPAM : null,
                spam ? "Hệ thống sàng lọc AI đã đánh dấu hồ sơ này là tin rác." : null);
        return new RejectSubmissionResponse(
                detail,
                reporterOf(submission),
                screening,
                REJECTABLE_STATUSES.contains(submission.getStatus()),
                SPAM_PENALTY,
                detail.rejection());
    }

    /** Người gửi ẩn danh -> null: Biên tập viên không được biết danh tính (chỉ Tổng biên tập giải mật được). */
    private RejectSubmissionResponse.Reporter reporterOf(Submission submission) {
        User author = submission.getAuthor();
        if (Boolean.TRUE.equals(submission.getIsAnonymous()) || author == null) {
            return null;
        }
        return new RejectSubmissionResponse.Reporter(
                author.getFullName(),
                author.getRole(),
                author.getReputationScore(),
                TextUtils.maskEmail(contactEmailOf(submission)),
                submissionRepository.countByAuthorIdAndStatusAndIdNot(author.getId(), SubmissionStatus.REJECTED,
                        submission.getId()));
    }

    /** Email liên hệ ghi trên hồ sơ; không có thì dùng email tài khoản. */
    private String contactEmailOf(Submission submission) {
        String contact = TextUtils.blankToNull(submission.getContactEmail());
        return contact != null ? contact : submission.getAuthor().getEmail();
    }

    private void notifyReporter(Submission submission, RejectReason reason, String feedback, boolean penalized) {
        String penalty = penalized
                ? "<p style=\"color:#b45309\">Điểm uy tín của bạn bị trừ " + SPAM_PENALTY
                + " điểm do hồ sơ là tin rác, quảng cáo.</p>"
                : "";
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Toà soạn <b>không tiếp nhận</b> hồ sơ <b>%s</b> (%s).</p>
                  <p>Lý do: <b>%s</b></p>
                  <p style="padding:12px 16px;background:#f5f7fb;border-radius:8px;white-space:pre-line">%s</p>
                  %s
                  <p>Bạn có thể xem chi tiết trong mục <b>Thông tin đã gửi</b> hoặc tra cứu bằng mã hồ sơ + mã PIN.</p>
                """.formatted(
                MailService.escape(submission.getAuthor().getFullName()),
                MailService.escape(submission.getTrackingCode()),
                MailService.escape(submission.getTitle()),
                MailService.escape(reason.getLabel()),
                MailService.escape(feedback),
                penalty));
        mailService.trySend(contactEmailOf(submission),
                "[Tin Nóng Dân Sinh] Hồ sơ " + submission.getTrackingCode() + " không được tiếp nhận", html);
    }
}
