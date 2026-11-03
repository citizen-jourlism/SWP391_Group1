package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.AssessImpactRequest;
import com.example.citizen_journalism.dto.editor.AssessImpactRequest.Area;
import com.example.citizen_journalism.dto.editor.AssessImpactRequest.Nature;
import com.example.citizen_journalism.dto.editor.AssessImpactRequest.People;
import com.example.citizen_journalism.dto.editor.AssessImpactResponse;
import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.Priority;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * ĐÁNH GIÁ MỨC TÁC ĐỘNG (UC Editor "Assess Impact Score") — xếp hồ sơ vào 4 mức LOW / MEDIUM / HIGH / BREAKING
 * để biết ai duyệt chốt: Phó TBT (LOW / MEDIUM) hay Tổng biên tập (HIGH / BREAKING, Phó TBT chuyển tiếp).
 * API: EditorController (GET /api/editor/submissions/{mã}/impact, POST cùng đường dẫn).
 * Frontend: routes/editor/EditorImpactAssessment.jsx (/editor/queue/:code/impact).
 *
 * Biên tập viên CHỈ TICK 3 tiêu chí; hệ thống tự tính điểm, màn hình không hiện điểm:
 *   điểm = A khu vực (5/10/20/30) + B số người (5/10/20/30) + C tính chất (5/15/25/40), từ 15 đến 100
 *   LOW 15-39 · MEDIUM 40-59 · HIGH 60-79 · BREAKING 80-100
 *   Nâng tối thiểu lên HIGH khi C = đe doạ tính mạng, hoặc BTV đánh dấu nội dung nhạy cảm (bắt buộc lý do).
 * Thang điểm công khai ở trang chủ (frontend routes/Homepage.jsx) phải khớp các số trên.
 *
 * KHÔNG thêm cột / bảng. Lưu ở:
 *   - submissions.impact_score + submissions.priority
 *   - 1 dòng submission_events (trạng thái không đổi, actor EDITOR), description "[IMPACT_SCORE] <mức>",
 *     note = JSON các lựa chọn (StoredAssessment). Dòng này là dữ liệu NỘI BỘ, người gửi không thấy
 *     (SubmissionTrackingService / NotificationReadService bỏ qua qua isInternalEvent).
 * Đánh giá lại = ghi thêm dòng mới, dòng mới nhất có hiệu lực. Chỉ đánh giá khi hồ sơ đang thẩm định (IN_REVIEW).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImpactScoreService {

    public static final String MARKER = "[IMPACT_SCORE]";

    static final int SENSITIVE_REASON_MIN = 10;

    private final SubmissionRepository submissionRepository;
    private final SubmissionEventRepository eventRepository;
    private final UserRepository userRepository;
    private final SubmissionTrackingService trackingService;
    private final ObjectMapper objectMapper;

    // ============================== QUY TẮC CHẤM ĐIỂM ==============================

    /** Kết quả tính: điểm, mức, có bị nâng mức không. */
    public record Evaluation(int score, Priority priority, boolean raised) {
    }

    /** Tính điểm và xếp mức từ 3 tiêu chí + cờ nhạy cảm. */
    public static Evaluation evaluate(Area area, People people, Nature nature, boolean sensitive) {
        int score = area.points + people.points + nature.points;
        Priority byScore = levelOf(score);
        boolean mustBeHigh = nature == Nature.LIFE_THREAT || sensitive;
        boolean raised = mustBeHigh && byScore.ordinal() < Priority.HIGH.ordinal();
        return new Evaluation(score, raised ? Priority.HIGH : byScore, raised);
    }

    /** Mức theo điểm (chưa xét quy tắc nâng mức). */
    public static Priority levelOf(int score) {
        if (score >= 80) {
            return Priority.BREAKING;
        }
        if (score >= 60) {
            return Priority.HIGH;
        }
        return score >= 40 ? Priority.MEDIUM : Priority.LOW;
    }

    /**
     * Định tuyến sau khi Phó TBT duyệt: true = chuyển tiếp Tổng biên tập (HIGH / BREAKING),
     * false = Phó TBT duyệt chốt (LOW / MEDIUM). Dùng cho màn duyệt của Phó TBT.
     */
    public static boolean escalatesToEic(Priority priority) {
        return priority == Priority.HIGH || priority == Priority.BREAKING;
    }

    /** Dòng nhật ký nội bộ của chức năng này (ẩn với người gửi). */
    public static boolean isInternalEvent(SubmissionEvent event) {
        return event.getDescription() != null && event.getDescription().startsWith(MARKER);
    }

    // ============================== API ==============================

    @Transactional(readOnly = true)
    public AssessImpactResponse getContext(String trackingCode) {
        return toResponse(findSubmission(trackingCode));
    }

    @Transactional
    public AssessImpactResponse assess(String editorId, String trackingCode, AssessImpactRequest request) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        String blockedReason = blockedReasonOf(submission);
        if (blockedReason != null) {
            throw AppException.conflict(blockedReason);
        }
        String reason = request.sensitive() ? TextUtils.blankToNull(request.sensitiveReason()) : null;
        if (request.sensitive() && (reason == null || reason.length() < SENSITIVE_REASON_MIN)) {
            throw AppException.badRequest("Vui lòng nhập lý do nội dung nhạy cảm (ít nhất 10 ký tự).");
        }

        Evaluation result = evaluate(request.area(), request.people(), request.nature(), request.sensitive());
        submission.setImpactScore(result.score());   // JPA tự ghi xuống DB khi kết thúc transaction
        submission.setPriority(result.priority());

        StoredAssessment stored = new StoredAssessment(request.area(), request.people(), request.nature(),
                request.sensitive(), reason, TextUtils.blankToNull(request.note()), result.score(), result.raised(),
                editor.getFullName());
        eventRepository.save(SubmissionEvent.builder()
                .submission(submission)
                .status(submission.getStatus())
                .actor(SubmissionEvent.Actor.EDITOR)
                .description(MARKER + " " + result.priority())
                .note(objectMapper.writeValueAsString(stored))
                .build());
        return toResponse(submission);
    }

    // ================================ HÀM PHỤ ================================

    /** Nội dung note (JSON) của dòng nhật ký "[IMPACT_SCORE]". */
    public record StoredAssessment(Area area, People people, Nature nature, boolean sensitive, String sensitiveReason,
                            String note, int score, boolean raised, String editorName) {
    }

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    /** Lý do không đánh giá được; null = đánh giá được. */
    private static String blockedReasonOf(Submission submission) {
        if (submission.getStatus() != SubmissionStatus.IN_REVIEW) {
            return "Chỉ đánh giá mức tác động khi hồ sơ đang thẩm định.";
        }
        return null;
    }

    private AssessImpactResponse toResponse(Submission submission) {
        String blockedReason = blockedReasonOf(submission);
        return new AssessImpactResponse(trackingService.getForStaff(submission.getTrackingCode()), blockedReason == null,
                blockedReason, deputyNameOf(submission), latestAssessment(submission));
    }

    private static String deputyNameOf(Submission submission) {
        Category category = submission.getCategory();
        return category == null || category.getDeputyEic() == null ? null : category.getDeputyEic().getFullName();
    }

    /** Lần đánh giá mới nhất (đọc từ nhật ký); mức lấy từ submissions.priority. */
    private AssessImpactResponse.Assessment latestAssessment(Submission submission) {
        List<SubmissionEvent> events = eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission);
        for (int i = events.size() - 1; i >= 0; i--) {
            SubmissionEvent event = events.get(i);
            if (!isInternalEvent(event) || event.getNote() == null) {
                continue;
            }
            try {
                StoredAssessment stored = objectMapper.readValue(event.getNote(), StoredAssessment.class);
                Priority priority = submission.getPriority() != null ? submission.getPriority()
                        : evaluate(stored.area(), stored.people(), stored.nature(), stored.sensitive()).priority();
                return new AssessImpactResponse.Assessment(stored.area(), stored.people(), stored.nature(),
                        stored.sensitive(), stored.sensitiveReason(), stored.note(), priority, stored.raised(),
                        escalatesToEic(priority), event.getCreatedAt(), stored.editorName());
            } catch (JacksonException ex) {
                log.warn("Không đọc được đánh giá mức tác động của hồ sơ {}: {}", submission.getTrackingCode(), ex.getMessage());
                return null;
            }
        }
        return null;
    }
}
