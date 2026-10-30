package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.InfoRequestResponse;
import com.example.citizen_journalism.dto.editor.RequestInfoRequest;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EditorialReviewRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * YÊU CẦU BỔ SUNG THÔNG TIN (Request Additional Information) — Biên tập viên đề nghị người gửi bổ sung bằng chứng / thông tin.
 * API: EditorController (GET /api/editor/submissions/{mã}/info-request, POST .../request-info).
 * Frontend: routes/editor/EditorRequestInfo.jsx; người gửi đọc lời nhắn ở hộp "Toà soạn đề nghị bổ sung" (RequestNoteCard)
 * và trả lời ở trang Bổ sung thông tin (SubmissionSupplementService), xong thì hồ sơ quay về IN_REVIEW.
 *
 * KHÔNG cần thêm cột / bảng mới. Khi gửi yêu cầu, ghi:
 *   - submissions.status = NEED_MORE_INFO + 1 bước nhật ký (SubmissionEventService.record):
 *       actor EDITOR, description "Toà soạn đề nghị bổ sung thông tin.",
 *       note = lời nhắn + các mục đánh số "1. ...", "2. ..." (SubmissionSupplementService đếm các dòng này
 *       để biết người gửi phải trả lời bao nhiêu mục, nên mỗi mục phải nằm trên 1 dòng)
 *   - editorial_reviews: review_role EDITOR, action REQUEST_INFO, comments = ghi chú nội bộ
 *   - gửi email cho người gửi (bỏ qua nếu hồ sơ ẩn danh, giống Từ chối hồ sơ)
 */
@Service
@RequiredArgsConstructor
public class SubmissionInfoRequestService {

    public static final String EVENT_DESCRIPTION = "Toà soạn đề nghị bổ sung thông tin.";

    /** Chỉ yêu cầu bổ sung được với hồ sơ đang ở bước tiếp nhận / thẩm định. */
    private static final Set<SubmissionStatus> REQUESTABLE_STATUSES =
            Set.of(SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW);

    private final SubmissionRepository submissionRepository;
    private final SubmissionEventRepository eventRepository;
    private final UserRepository userRepository;
    private final EditorialReviewRepository reviewRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;
    private final NotificationMailService notificationMailService;

    /** Dữ liệu màn Yêu cầu bổ sung: chi tiết hồ sơ, người gửi, yêu cầu đang chờ (nếu có). */
    @Transactional(readOnly = true)
    public InfoRequestResponse getContext(String trackingCode) {
        return toContext(findSubmission(trackingCode));
    }

    @Transactional
    public InfoRequestResponse requestInfo(String editorId, String trackingCode, RequestInfoRequest request) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        if (!REQUESTABLE_STATUSES.contains(submission.getStatus())) {
            throw AppException.conflict("Hồ sơ không ở bước tiếp nhận / thẩm định, không thể yêu cầu bổ sung.");
        }

        String note = buildNote(request.message(), request.items());
        eventService.record(submission, SubmissionStatus.NEED_MORE_INFO, SubmissionEvent.Actor.EDITOR,
                EVENT_DESCRIPTION, note);
        reviewRepository.save(EditoralReview.builder()
                .submission(submission)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(EditoralReview.ReviewAction.REQUEST_INFO)
                .comments(TextUtils.blankToNull(request.internalNote()))
                .build());

        if (!Boolean.TRUE.equals(submission.getIsAnonymous()) && submission.getAuthor() != null) {
            notifyReporter(submission, note);
        }
        return toContext(submission);
    }

    /**
     * Ghép lời nhắn + các mục thành note gửi người gửi: "Lời nhắn\n1. Mục 1\n2. Mục 2".
     * Mỗi mục gộp về 1 dòng (giống frontend lib/requestInfo.js -> buildRequestNote).
     */
    static String buildNote(String message, List<String> items) {
        List<String> lines = new ArrayList<>();
        String intro = TextUtils.blankToNull(message);
        if (intro != null) {
            lines.add(intro);
        }
        for (int i = 0; i < items.size(); i++) {
            lines.add((i + 1) + ". " + items.get(i).replaceAll("\\s+", " ").trim());
        }
        return String.join("\n", lines);
    }

    // ================================ HÀM PHỤ ================================

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    private InfoRequestResponse toContext(Submission submission) {
        SubmissionDetail detail = trackingService.getForStaff(submission.getTrackingCode());
        return new InfoRequestResponse(
                detail,
                reporterOf(submission),
                REQUESTABLE_STATUSES.contains(submission.getStatus()),
                pendingRequestOf(submission));
    }

    /**
     * Yêu cầu đang chờ (chỉ khi hồ sơ NEED_MORE_INFO), gom từ:
     *   - bước nhật ký NEED_MORE_INFO gần nhất: lời nhắn người gửi thấy + thời điểm
     *   - editorial_reviews REQUEST_INFO gần nhất: Biên tập viên yêu cầu + ghi chú nội bộ
     */
    private InfoRequestResponse.PendingRequest pendingRequestOf(Submission submission) {
        if (submission.getStatus() != SubmissionStatus.NEED_MORE_INFO) {
            return null;
        }
        List<SubmissionEvent> events = eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission);
        SubmissionEvent step = null;
        for (int i = events.size() - 1; i >= 0 && step == null; i--) {
            if (events.get(i).getStatus() == SubmissionStatus.NEED_MORE_INFO) {
                step = events.get(i);
            }
        }
        if (step == null) {
            return null;
        }
        EditoralReview review = reviewRepository
                .findFirstBySubmissionAndActionOrderByCreatedAtDescIdDesc(submission, EditoralReview.ReviewAction.REQUEST_INFO)
                .orElse(null);
        return new InfoRequestResponse.PendingRequest(
                step.getNote(),
                step.getCreatedAt(),
                review == null || review.getReviewer() == null ? null : review.getReviewer().getFullName(),
                review == null ? null : review.getComments());
    }

    /** Người gửi ẩn danh -> null: Biên tập viên không được biết danh tính (chỉ Tổng biên tập giải mật được). */
    private InfoRequestResponse.Reporter reporterOf(Submission submission) {
        User author = submission.getAuthor();
        if (Boolean.TRUE.equals(submission.getIsAnonymous()) || author == null) {
            return null;
        }
        return new InfoRequestResponse.Reporter(
                author.getFullName(),
                author.getRole(),
                author.getReputationScore(),
                TextUtils.maskEmail(contactEmailOf(submission)));
    }

    /** Email liên hệ ghi trên hồ sơ; không có thì dùng email tài khoản. */
    private String contactEmailOf(Submission submission) {
        String contact = TextUtils.blankToNull(submission.getContactEmail());
        return contact != null ? contact : submission.getAuthor().getEmail();
    }

    private void notifyReporter(Submission submission, String note) {
        String html = NotificationMailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Toà soạn đề nghị bạn <b>bổ sung thông tin</b> cho hồ sơ <b>%s</b> (%s).</p>
                  <p style="padding:12px 16px;background:#f5f7fb;border-radius:8px;white-space:pre-line">%s</p>
                  <p>Bạn vui lòng đăng nhập, vào mục <b>Thông tin đã gửi</b>, mở hồ sơ và bấm <b>Bổ sung ngay</b>.
                  Sau khi bạn bổ sung, toà soạn sẽ tiếp tục thẩm định hồ sơ.</p>
                """.formatted(
                NotificationMailService.escape(submission.getAuthor().getFullName()),
                NotificationMailService.escape(submission.getTrackingCode()),
                NotificationMailService.escape(submission.getTitle()),
                NotificationMailService.escape(note)));
        notificationMailService.trySend(contactEmailOf(submission),
                "[Tin Nóng Dân Sinh] Hồ sơ " + submission.getTrackingCode() + " cần bổ sung thông tin", html);
    }
}
