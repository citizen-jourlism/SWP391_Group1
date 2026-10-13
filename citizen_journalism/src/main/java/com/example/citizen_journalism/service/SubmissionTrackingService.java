package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.SubmissionSummary;
import com.example.citizen_journalism.dto.submission.TimelineEntry;
import com.example.citizen_journalism.dto.submission.TrackRequest;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * THEO DÕI TRẠNG THÁI HỒ SƠ (SRS 4.1.2 "Submission Status Tracker"). Có 2 cách:
 *
 *   1. track()   : tra cứu bằng MÃ HỒ SƠ + MÃ PIN, KHÔNG cần đăng nhập (TrackingController).
 *                  Dành cho mọi người gửi, kể cả gửi ẩn danh hoặc đang dùng máy khác.
 *   2. listMine() / getMine(): người gửi ĐÃ ĐĂNG NHẬP xem danh sách "Hồ sơ đã gửi" và chi tiết từng hồ sơ,
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
    private static final int MAX_PAGE_SIZE = 50;

    private final SubmissionRepository submissionRepository;
    private final EvidenceRepository evidenceRepository;
    private final SubmissionEventRepository eventRepository;
    private final UserRepository userRepository;
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
                    + minutesUntil(now, lockedUntil) + " phút.");
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
        return toDetail(submission);
    }

    // ============================ 2. HỒ SƠ CỦA TÔI ============================

    /** Danh sách hồ sơ của người đang đăng nhập, mới nhất lên đầu. */
    @Transactional(readOnly = true)
    public PageResponse<SubmissionSummary> listMine(String userId, int page, int size) {
        userRepository.getActiveById(userId); // Tài khoản bị khoá giữa chừng -> báo đăng nhập lại
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        // page.map(...): đổi từng Submission trong trang thành SubmissionSummary, giữ nguyên thông tin phân trang
        return PageResponse.from(submissionRepository.findByAuthorId(userId, pageable).map(SubmissionSummary::from));
    }

    /** Chi tiết 1 hồ sơ của người đang đăng nhập. Hồ sơ của người khác -> báo không tìm thấy. */
    @Transactional(readOnly = true)
    public SubmissionDetail getMine(String userId, String trackingCode) {
        userRepository.getActiveById(userId);
        return submissionRepository.findByTrackingCodeAndAuthorId(trackingCode.trim().toUpperCase(Locale.ROOT), userId)
                .map(this::toDetail)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    // ================================ HÀM PHỤ ================================

    /** Gom hồ sơ + tệp tư liệu + nhật ký thành SubmissionDetail (không kèm thông tin liên hệ người gửi). */
    private SubmissionDetail toDetail(Submission submission) {
        List<SubmissionEvent> events = eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission);
        List<EvidenceInfo> evidences = evidenceRepository.findBySubmissionOrderByIdAsc(submission).stream()
                .map(evidence -> EvidenceInfo.from(evidence, objectMapper))
                .toList();

        // Lời nhắn "đề nghị bổ sung" = ghi chú của bước gần nhất, chỉ khi hồ sơ đang ở trạng thái cần bổ sung
        String requestNote = submission.getStatus() == Submission.SubmissionStatus.NEED_MORE_INFO && !events.isEmpty()
                ? events.get(events.size() - 1).getNote()
                : null;

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
                evidences,
                events.stream().map(TimelineEntry::from).toList());
    }

    /** Số phút (làm tròn lên) từ bây giờ tới lúc hết khoá, ví dụ còn 4 phút 10 giây -> 5. */
    private static long minutesUntil(LocalDateTime now, LocalDateTime until) {
        return Math.max(1, (Duration.between(now, until).getSeconds() + 59) / 60);
    }
}
