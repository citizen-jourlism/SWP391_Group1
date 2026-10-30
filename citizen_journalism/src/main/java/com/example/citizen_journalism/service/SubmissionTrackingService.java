package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.RejectReason;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.dto.submission.RejectionInfo;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.SubmissionSummary;
import com.example.citizen_journalism.dto.submission.TimelineEntry;
import com.example.citizen_journalism.dto.submission.TrackRequest;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EditorialReviewRepository;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.util.Paging;
import com.example.citizen_journalism.util.TimeUtils;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * THEO DÕI TRẠNG THÁI HỒ SƠ. Có 2 cách:
 *
 *   1. track()   : tra cứu bằng MÃ HỒ SƠ + MÃ PIN, KHÔNG cần đăng nhập (TrackingController).
 *                  Dành cho mọi người gửi, kể cả gửi ẩn danh hoặc đang dùng máy khác.
 *   2. listMine() / getMine(): người gửi ĐÃ ĐĂNG NHẬP xem danh sách "Thông tin đã gửi" và chi tiết từng hồ sơ,
 *                  không cần nhập PIN vì đã biết chắc là chủ hồ sơ (SubmissionController).
 * Cả 2 cách trả về cùng một SubmissionDetail (toDetail).
 *
 * CHỐNG DÒ MÃ PIN: PIN chỉ có 6 số, người xấu có thể thử lần lượt. Vì vậy mỗi hồ sơ chỉ cho nhập sai
 * tối đa app.tracking.max-pin-attempts lần liên tiếp, sau đó khoá tra cứu hồ sơ đó app.tracking.lock-minutes phút.
 * Thông báo sai luôn là "Mã hồ sơ hoặc mã PIN không đúng." (không nói rõ sai cái nào), để không dò được mã nào có thật.
 */
@Service
@RequiredArgsConstructor
public class SubmissionTrackingService {

    private static final String INVALID_MESSAGE = "Mã hồ sơ hoặc mã PIN không đúng.";

    /** editorial_reviews.comments của lần từ chối: "[MÃ LÝ DO] ghi chú nội bộ" (xem SubmissionRejectionService). */
    private static final Pattern REJECT_COMMENT = Pattern.compile("^\\[(\\w+)\\]\\s*(.*)$", Pattern.DOTALL);

    private final SubmissionRepository submissionRepository;
    private final EvidenceRepository evidenceRepository;
    private final SubmissionEventRepository eventRepository;
    private final EditorialReviewRepository reviewRepository;
    private final ReputationLogRepository reputationLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("${app.tracking.max-pin-attempts:5}")
    private int maxPinAttempts;

    @Value("${app.tracking.lock-minutes:15}")
    private long lockMinutes;

    // ============================ 1. TRA CỨU BẰNG MÃ + PIN ============================

    /**
     * noRollbackFor: khi nhập sai PIN, hàm ném lỗi NHƯNG số lần sai vẫn phải được lưu lại
     * (mặc định Spring huỷ mọi thay đổi trong transaction khi có lỗi -> bộ đếm sẽ không bao giờ tăng).
     */
    @Transactional(noRollbackFor = AppException.class)
    public SubmissionDetail track(TrackRequest request) {
        // Chuẩn hoá: bỏ khoảng trắng, viết hoa ("kb-2026-0001 " -> "KB-2026-0001")
        String code = request.trackingCode().trim().toUpperCase(Locale.ROOT);
        Submission submission = submissionRepository.findByTrackingCode(code)
                .orElseThrow(() -> AppException.badRequest(INVALID_MESSAGE));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lockedUntil = submission.getPinLockedUntil();
        if (lockedUntil != null && now.isBefore(lockedUntil)) {
            throw AppException.tooManyRequests("Bạn đã nhập sai mã PIN quá nhiều lần. Vui lòng thử lại sau "
                    + TimeUtils.minutesUntil(now, lockedUntil) + " phút.");
        }

        if (!passwordEncoder.matches(request.pin(), submission.getPinHash())) {
            int attempts = submission.getPinFailedAttempts() + 1;
            if (attempts >= maxPinAttempts) {
                // Đủ số lần sai -> khoá, đặt lại bộ đếm cho lượt sau khi hết khoá
                submissionRepository.updatePinGuard(submission.getId(), 0, now.plusMinutes(lockMinutes));
                throw AppException.tooManyRequests("Bạn đã nhập sai mã PIN quá nhiều lần. Tra cứu hồ sơ này tạm khoá "
                        + lockMinutes + " phút.");
            }
            submissionRepository.updatePinGuard(submission.getId(), attempts, null);
            throw AppException.badRequest(INVALID_MESSAGE);
        }

        // Đúng PIN -> xoá bộ đếm sai (chỉ khi đang có, để khỏi ghi DB thừa)
        if (submission.getPinFailedAttempts() > 0 || lockedUntil != null) {
            submissionRepository.updatePinGuard(submission.getId(), 0, null);
        }
        return toDetail(submission, true);
    }

    // ============================ 2. HỒ SƠ CỦA TÔI ============================

    /**
     * Danh sách hồ sơ của người đang đăng nhập, mới nhất lên đầu.
     * (Tài khoản bị khoá giữa chừng đã bị chặn từ trước, ở security/ActiveUserJwtConverter.)
     */
    @Transactional(readOnly = true)
    public PageResponse<SubmissionSummary> listMine(String userId, int page, int size) {
        // page.map(...): đổi từng Submission trong trang thành SubmissionSummary, giữ nguyên thông tin phân trang
        return PageResponse.from(submissionRepository.findByAuthorIdAndTypeNot(
                        userId, Submission.SubmissionType.CONTRIBUTOR_POST, Paging.of(page, size, Paging.NEWEST_FIRST))
                .map(SubmissionSummary::from));
    }

    /** Chi tiết 1 hồ sơ của người đang đăng nhập. Hồ sơ của người khác -> báo không tìm thấy. */
    @Transactional(readOnly = true)
    public SubmissionDetail getMine(String userId, String trackingCode) {
        return submissionRepository.findByTrackingCodeAndAuthorId(trackingCode.trim().toUpperCase(Locale.ROOT), userId)
                .map(submission -> toDetail(submission, true))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    // ============================ 3. NHÂN SỰ TOÀ SOẠN XEM ============================

    /** Chi tiết 1 hồ sơ bất kỳ theo mã, cho Biên tập viên (EditorService). Quyền đã kiểm tra ở SecurityConfig. */
    @Transactional(readOnly = true)
    public SubmissionDetail getForStaff(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .map(submission -> toDetail(submission, false))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    // ================================ HÀM PHỤ ================================

    /**
     * Gom hồ sơ + tệp tư liệu + nhật ký thành SubmissionDetail (không kèm thông tin liên hệ người gửi).
     *
     * @param forReporter true = người gửi xem: phần từ chối bỏ ghi chú nội bộ và tên Biên tập viên
     */
    private SubmissionDetail toDetail(Submission submission, boolean forReporter) {
        List<SubmissionEvent> events = eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission);
        List<EvidenceInfo> evidences = evidenceRepository.findBySubmissionOrderByIdAsc(submission).stream()
                .map(evidence -> EvidenceInfo.from(evidence, objectMapper))
                .toList();

        // Lời nhắn "đề nghị bổ sung" = ghi chú của bước gần nhất, chỉ khi hồ sơ đang ở trạng thái cần bổ sung
        SubmissionEvent infoRequest = submission.getStatus() == Submission.SubmissionStatus.NEED_MORE_INFO
                ? SubmissionEventService.latestInfoRequest(events)
                : null;
        String requestNote = infoRequest == null ? null : infoRequest.getNote();

        RejectionInfo rejection = rejectionOf(submission, events);
        if (rejection != null && forReporter) {
            rejection = rejection.forReporter();
        }

        return new SubmissionDetail(
                submission.getTrackingCode(),
                submission.getReportCategory(),
                submission.getTitle(),
                submission.getSummary(),
                submission.getContent(),
                submission.getIncidentAt(),
                submission.getProvince(),
                submission.getAddress(),
                Boolean.TRUE.equals(submission.getIsAnonymous()),
                submission.getStatus(),
                submission.getCreatedAt(),
                submission.getUpdatedAt(),
                requestNote,
                rejection,
                evidences,
                events.stream().map(TimelineEntry::from).toList());
    }

    /**
     * Lần từ chối gần nhất (chỉ khi hồ sơ đang REJECTED), gom từ 3 nơi vì DB không có cột lý do riêng:
     *   - editorial_reviews (action REJECT): mã lý do + ghi chú nội bộ trong cột comments, người từ chối
     *   - bước nhật ký REJECTED cuối cùng: phản hồi gửi người gửi (note) + thời điểm
     *   - reputation_logs gắn với hồ sơ: số điểm uy tín đã trừ
     */
    private RejectionInfo rejectionOf(Submission submission, List<SubmissionEvent> events) {
        if (submission.getStatus() != Submission.SubmissionStatus.REJECTED) {
            return null;
        }
        SubmissionEvent step = events.stream()
                .filter(event -> event.getStatus() == Submission.SubmissionStatus.REJECTED)
                .reduce((first, second) -> second) // lấy bước cuối cùng
                .orElse(null);
        EditoralReview review = reviewRepository
                .findFirstBySubmissionAndActionOrderByCreatedAtDescIdDesc(submission, EditoralReview.ReviewAction.REJECT)
                .orElse(null);

        String reasonCode = null;
        String internalNote = null;
        if (review != null && review.getComments() != null) {
            Matcher matcher = REJECT_COMMENT.matcher(review.getComments());
            if (matcher.matches()) {
                reasonCode = matcher.group(1);
                internalNote = matcher.group(2).isBlank() ? null : matcher.group(2).trim();
            } else {
                internalNote = review.getComments();
            }
        }
        RejectReason reason = RejectReason.fromCode(reasonCode);
        int penaltyPoints = reputationLogRepository.findByRelatedSubmission(submission).stream()
                .filter(log -> log.getReason() == ReputationLog.ReputationReason.SPAM_REPORTED && log.getPointsChange() < 0)
                .mapToInt(log -> -log.getPointsChange())
                .sum();

        return new RejectionInfo(
                reason,
                reason.getLabel(),
                step == null ? null : step.getNote(),
                internalNote,
                penaltyPoints,
                review == null ? null : review.getReviewer().getFullName(),
                step == null ? submission.getUpdatedAt() : step.getCreatedAt());
    }

}
