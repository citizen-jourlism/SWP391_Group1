package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.ConfirmDuplicateRequest;
import com.example.citizen_journalism.dto.editor.DismissDuplicateRequest;
import com.example.citizen_journalism.dto.editor.DuplicateCheckResponse;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.service.DuplicateDetectionService.StoredCandidate;
import com.example.citizen_journalism.service.DuplicateDetectionService.StoredResult;
import com.example.citizen_journalism.util.TextUtils;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * KIỂM TRA TIN TRÙNG (UC Editor "Check for Duplication") — màn hình và kết luận của Biên tập viên.
 * API: EditorController (/api/editor/submissions/{mã}/duplicates[/confirm|/dismiss]).
 * Frontend: routes/editor/EditorDuplicateCheck.jsx (/editor/screening/:code). Phần AI: DuplicateDetectionService.
 *
 * AI CHỈ HỖ TRỢ RA QUYẾT ĐỊNH: Biên tập viên xem gợi ý rồi GHI NHẬN kết luận (trùng với hồ sơ nào / không trùng).
 * Kết luận chỉ được lưu lại; không gộp hồ sơ, không đổi trạng thái hay dữ liệu nào của hồ sơ. Hồ sơ trùng thì
 * Biên tập viên xử lý tiếp bằng chức năng sẵn có (ví dụ Từ chối hồ sơ). Ghi lại lần nữa = đổi kết luận.
 *
 * Không thêm cột / bảng ngoài submission_embeddings. Lưu ở:
 *   - Kết quả AI: dòng submission_events mới nhất có description bắt đầu "[DUPLICATE_CHECK]" (note = JSON).
 *   - Kết luận: dòng submission_events actor EDITOR, description "[DUPLICATE_REVIEW] DUPLICATE <mã hồ sơ bị trùng>"
 *     hoặc "[DUPLICATE_REVIEW] DISTINCT", note = ghi chú nội bộ. Các dòng này không hiện trong nhật ký người gửi.
 *
 * Quét lại tự động khi mở màn hình mà chưa có kết quả, hoặc người gửi đã bổ sung thông tin sau lần quét gần nhất.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DuplicateReviewService {

    static final String DUPLICATE = "DUPLICATE";
    static final String DISTINCT = "DISTINCT";

    /** Chỉ kết luận khi hồ sơ còn ở hàng đợi tiếp nhận / đang thẩm định. */
    private static final Set<SubmissionStatus> DECIDABLE = EnumSet.of(SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW);

    private final SubmissionRepository submissionRepository;
    private final SubmissionEventRepository eventRepository;
    private final EvidenceRepository evidenceRepository;
    private final UserRepository userRepository;
    private final SubmissionTrackingService trackingService;
    private final DuplicateDetectionService detectionService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public DuplicateCheckResponse getContext(String trackingCode) {
        Submission submission = findSubmission(trackingCode);
        List<SubmissionEvent> events = eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission);
        SubmissionEvent check = latestCheck(events);
        if (needsCheck(events, check) && !detectionService.isRunning(submission.getId())) {
            detectionService.requestCheck(submission.getId());
        }
        return toResponse(submission, events);
    }

    /** Ghi nhận: hồ sơ trùng sự việc với hồ sơ originalCode. */
    @Transactional
    public DuplicateCheckResponse confirm(String editorId, String trackingCode, ConfirmDuplicateRequest request) {
        userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        requireDecidable(submission);
        Submission original = submissionRepository.findByTrackingCode(normalize(request.originalCode()))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ " + request.originalCode().trim() + "."));
        if (original.getId().equals(submission.getId())) {
            throw AppException.badRequest("Không thể ghi nhận hồ sơ trùng với chính nó.");
        }
        recordReview(submission, DUPLICATE + " " + original.getTrackingCode(), request.note());
        return toResponse(submission, eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission));
    }

    /** Ghi nhận: hồ sơ không trùng với hồ sơ nào. */
    @Transactional
    public DuplicateCheckResponse dismiss(String editorId, String trackingCode, DismissDuplicateRequest request) {
        userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        requireDecidable(submission);
        recordReview(submission, DISTINCT, request == null ? null : request.note());
        return toResponse(submission, eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission));
    }

    // ================================ HÀM PHỤ ================================

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(normalize(trackingCode))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    private static String normalize(String trackingCode) {
        return trackingCode.trim().toUpperCase(Locale.ROOT);
    }

    private static void requireDecidable(Submission submission) {
        if (!DECIDABLE.contains(submission.getStatus())) {
            throw AppException.conflict("Chỉ ghi nhận kết luận tin trùng khi hồ sơ đang chờ tiếp nhận hoặc đang thẩm định.");
        }
    }

    /** Ghi kết luận vào nhật ký (không đổi trạng thái). */
    private void recordReview(Submission submission, String decision, String note) {
        eventRepository.save(SubmissionEvent.builder()
                .submission(submission)
                .status(submission.getStatus())
                .actor(SubmissionEvent.Actor.EDITOR)
                .description(DuplicateDetectionService.REVIEW_MARKER + " " + decision)
                .note(TextUtils.blankToNull(note))
                .build());
    }

    private static SubmissionEvent latestCheck(List<SubmissionEvent> events) {
        return latest(events, DuplicateDetectionService.CHECK_MARKER);
    }

    private static SubmissionEvent latest(List<SubmissionEvent> events, String marker) {
        for (int i = events.size() - 1; i >= 0; i--) {
            String description = events.get(i).getDescription();
            if (description != null && description.startsWith(marker)) {
                return events.get(i);
            }
        }
        return null;
    }

    /** Cần quét khi chưa có kết quả, hoặc người gửi bổ sung thông tin sau lần quét gần nhất. */
    static boolean needsCheck(List<SubmissionEvent> events, SubmissionEvent check) {
        if (check == null) {
            return true;
        }
        int checkIndex = events.indexOf(check);
        return events.subList(checkIndex + 1, events.size()).stream()
                .anyMatch(event -> event.getActor() == SubmissionEvent.Actor.REPORTER);
    }

    private DuplicateCheckResponse toResponse(Submission submission, List<SubmissionEvent> events) {
        SubmissionEvent check = latestCheck(events);
        StoredResult result = check == null ? null : readResult(check);
        boolean processing = result == null || needsCheck(events, check) || detectionService.isRunning(submission.getId());

        String summary = submission.getAiSummary() != null ? submission.getAiSummary()
                : result == null ? null : result.summary();
        DuplicateCheckResponse.Screening screening = new DuplicateCheckResponse.Screening(
                processing ? "PROCESSING" : "DONE",
                summary,
                result == null ? detectionService.getThreshold() : result.threshold(),
                result == null ? detectionService.getWindowDays() : result.windowDays(),
                check == null ? null : check.getCreatedAt());

        List<DuplicateCheckResponse.Candidate> candidates = processing || result == null
                ? List.of()
                : candidatesOf(submission, result);
        return new DuplicateCheckResponse(trackingService.getForStaff(submission.getTrackingCode()), screening,
                candidates, reviewOf(events));
    }

    private StoredResult readResult(SubmissionEvent check) {
        try {
            return objectMapper.readValue(check.getNote(), StoredResult.class);
        } catch (RuntimeException ex) {
            log.warn("Kết quả kiểm tra tin trùng (sự kiện id={}) không đọc được: {}", check.getId(), ex.getMessage());
            return null;
        }
    }

    /** Ghép số liệu của lần quét với dữ liệu hiện tại của từng hồ sơ gợi ý. Hồ sơ đã bị xoá thì bỏ qua. */
    private List<DuplicateCheckResponse.Candidate> candidatesOf(Submission submission, StoredResult result) {
        List<Long> ids = result.candidates().stream().map(StoredCandidate::submissionId).toList();
        Map<Long, Submission> byId = submissionRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Submission::getId, Function.identity()));
        List<DuplicateCheckResponse.Candidate> candidates = new ArrayList<>();
        for (StoredCandidate stored : result.candidates()) {
            Submission other = byId.get(stored.submissionId());
            if (other == null || other.getId().equals(submission.getId())) {
                continue;
            }
            List<EvidenceInfo> evidences = evidenceRepository.findBySubmissionOrderByIdAsc(other).stream()
                    .map(evidence -> EvidenceInfo.from(evidence, objectMapper))
                    .toList();
            candidates.add(new DuplicateCheckResponse.Candidate(
                    other.getTrackingCode(),
                    other.getReportCategory(),
                    other.getTitle(),
                    other.getContent(),
                    other.getAddress(),
                    other.getProvince(),
                    other.getStatus(),
                    other.getCreatedAt(),
                    other.getAssignedEditor() == null ? null : other.getAssignedEditor().getFullName(),
                    evidences,
                    stored.similarity(),
                    stored.reason(),
                    stored.matchedPhrases() == null ? List.of() : stored.matchedPhrases(),
                    new DuplicateCheckResponse.Signals(null, stored.sameProvince(),
                            stored.minutesApart() < 0 ? null : stored.minutesApart(),
                            stored.contentSimilarity())));
        }
        return candidates;
    }

    /** Kết luận hiện tại = lần ghi nhận gần nhất. Hồ sơ bị trùng đã bị xoá thì vẫn trả mã, tiêu đề null. */
    private DuplicateCheckResponse.Review reviewOf(List<SubmissionEvent> events) {
        SubmissionEvent review = latest(events, DuplicateDetectionService.REVIEW_MARKER);
        if (review == null) {
            return null;
        }
        String[] parts = review.getDescription().substring(DuplicateDetectionService.REVIEW_MARKER.length()).trim().split("\\s+");
        if (parts.length >= 2 && DUPLICATE.equals(parts[0])) {
            String code = parts[1];
            String title = submissionRepository.findByTrackingCode(code).map(Submission::getTitle).orElse(null);
            return new DuplicateCheckResponse.Review(DUPLICATE, new DuplicateCheckResponse.Original(code, title),
                    review.getNote(), review.getCreatedAt());
        }
        if (parts.length >= 1 && DISTINCT.equals(parts[0])) {
            return new DuplicateCheckResponse.Review(DISTINCT, null, review.getNote(), review.getCreatedAt());
        }
        return null;
    }
}
