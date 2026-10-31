package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.VerificationReviewRequest;
import com.example.citizen_journalism.dto.editor.VerificationReviewRequest.Criterion;
import com.example.citizen_journalism.dto.editor.VerificationReviewResponse;
import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.Evidence;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.FieldReportFeedback.ReviewStatus;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EditorialReviewRepository;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.FieldAssignmentRepository;
import com.example.citizen_journalism.repository.FieldReportRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * DUYỆT KẾT QUẢ XÁC MINH (Review Verification Result) — sau khi Cộng tác viên xác minh thực địa và nộp bài,
 * Biên tập viên đối chiếu bài CTV với tin gốc, xem kết quả sàng lọc tự động, đánh giá 5 tiêu chí rồi chuyển
 * Phó Tổng biên tập phê duyệt.
 * API: EditorController (GET / POST /api/editor/submissions/{mã}/verification-review).
 * Frontend: routes/editor/EditorVerificationReview.jsx (/editor/queue/:code/verification).
 *
 * Điều kiện duyệt: hồ sơ IN_REVIEW VÀ nhiệm vụ field_assignments gần nhất đã COMPLETED, có bài CTV (output_submission_id)
 * VÀ báo cáo hiện trường đã được Biên tập viên duyệt (không còn yêu cầu sửa bài / bổ sung tư liệu đang chờ).
 * KHÔNG thêm cột / bảng mới. Khi đủ 5 tiêu chí Đạt, ghi:
 *   - submissions.status = DEPUTY_PENDING + 1 bước nhật ký (actor EDITOR, không có note vì người gửi đọc được nhật ký)
 *   - submissions.assigned_editor_id = Biên tập viên duyệt (nếu hồ sơ chưa có BTV phụ trách)
 *   - editorial_reviews: review_role EDITOR, action APPROVE,
 *     comments = "[VERIFICATION_REVIEW]\n1. Tiêu chí: Đạt\n...\nGhi chú: ..." (mã đánh dấu để phân biệt với Duyệt tin nóng)
 * Có tiêu chí Chưa đạt thì không lưu gì: frontend chuyển Biên tập viên sang Yêu cầu bổ sung hoặc Từ chối.
 */
@Service
@RequiredArgsConstructor
public class SubmissionVerificationReviewService {

    public static final String EVENT_DESCRIPTION = "Biên tập viên đã duyệt kết quả xác minh, chuyển Phó Tổng biên tập phê duyệt.";

    /** Mã đầu dòng trong editorial_reviews.comments, để tìm lại lần duyệt kết quả xác minh. */
    static final String COMMENT_MARKER = "[VERIFICATION_REVIEW]";

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final FieldAssignmentRepository assignmentRepository;
    private final FieldReportRepository fieldReportRepository;
    private final FieldReportService fieldReportService;
    private final EvidenceRepository evidenceRepository;
    private final EditorialReviewRepository reviewRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;
    private final ObjectMapper objectMapper;

    /** Dữ liệu màn duyệt: tin gốc, nhiệm vụ + bài CTV, kết quả sàng lọc, duyệt được không, lần duyệt đã lưu. */
    @Transactional(readOnly = true)
    public VerificationReviewResponse getContext(String trackingCode) {
        return toContext(findSubmission(trackingCode));
    }

    @Transactional
    public VerificationReviewResponse review(String editorId, String trackingCode, VerificationReviewRequest request) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        FieldAssignment assignment = latestAssignment(submission);
        String blockedReason = blockedReasonOf(submission, assignment);
        if (blockedReason != null) {
            throw AppException.conflict(blockedReason);
        }
        validateChecks(request.checks());

        eventService.record(submission, SubmissionStatus.DEPUTY_PENDING, SubmissionEvent.Actor.EDITOR,
                EVENT_DESCRIPTION, null);
        if (submission.getAssignedEditor() == null) {
            submission.setAssignedEditor(editor); // JPA tự ghi xuống DB khi kết thúc transaction
        }
        reviewRepository.save(EditoralReview.builder()
                .submission(submission)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(EditoralReview.ReviewAction.APPROVE)
                .comments(buildComments(request))
                .build());
        return toContext(submission);
    }

    /**
     * Ghép kết quả thành comments: "[VERIFICATION_REVIEW]\n1. Tiêu đề & nội dung bài CTV: Đạt\n...\nGhi chú: ...".
     * Thứ tự tiêu chí theo enum Criterion, không theo thứ tự frontend gửi.
     */
    static String buildComments(VerificationReviewRequest request) {
        List<String> lines = new ArrayList<>();
        lines.add(COMMENT_MARKER);
        Criterion[] criteria = Criterion.values();
        for (int i = 0; i < criteria.length; i++) {
            lines.add((i + 1) + ". " + criteria[i].getLabel() + ": Đạt");
        }
        String note = TextUtils.blankToNull(request.note());
        if (note != null) {
            lines.add("Ghi chú: " + note);
        }
        return String.join("\n", lines);
    }

    // ================================ HÀM PHỤ ================================

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    /** Đủ 5 tiêu chí, không trùng, tất cả Đạt. Annotation trên DTO đã kiểm tra số lượng và giá trị rỗng. */
    private void validateChecks(List<VerificationReviewRequest.Check> checks) {
        Set<Criterion> seen = EnumSet.noneOf(Criterion.class);
        for (VerificationReviewRequest.Check check : checks) {
            seen.add(check.criterion());
        }
        if (seen.size() != Criterion.values().length) {
            throw AppException.badRequest("Vui lòng đánh giá đủ 5 tiêu chí, mỗi tiêu chí 1 lần.");
        }
        if (checks.stream().anyMatch(check -> !Boolean.TRUE.equals(check.passed()))) {
            throw AppException.badRequest("Hồ sơ còn tiêu chí chưa đạt nên chưa thể chuyển Phó Tổng biên tập. "
                    + "Hãy yêu cầu bổ sung hoặc từ chối hồ sơ.");
        }
    }

    /** Nhiệm vụ gần nhất chưa bị huỷ (nhiệm vụ cũ bị huỷ thì Biên tập viên giao lại nhiệm vụ mới). */
    private FieldAssignment latestAssignment(Submission submission) {
        return assignmentRepository.findBySubmissionOrderByCreatedAtDescIdDesc(submission).stream()
                .filter(assignment -> assignment.getStatus() != FieldAssignment.AssignmentStatus.CANCELLED)
                .findFirst()
                .orElse(null);
    }

    /** Lý do chưa duyệt được; null = duyệt được. */
    private String blockedReasonOf(Submission submission, FieldAssignment assignment) {
        if (submission.getStatus() != SubmissionStatus.IN_REVIEW) {
            return "Chỉ duyệt kết quả xác minh được với hồ sơ đang thẩm định.";
        }
        if (assignment == null) {
            return "Hồ sơ chưa được giao Cộng tác viên xác minh thực địa.";
        }
        if (assignment.getStatus() != FieldAssignment.AssignmentStatus.COMPLETED || assignment.getOutputSubmission() == null) {
            return "Nhiệm vụ xác minh chưa hoàn thành: Cộng tác viên chưa nộp bài và báo cáo.";
        }
        ReviewStatus reportStatus = fieldReportService.reviewStatuses(List.of(assignment.getId())).get(assignment.getId());
        if (reportStatus != ReviewStatus.APPROVED) {
            return "Báo cáo của Cộng tác viên chưa được duyệt. Hãy duyệt báo cáo ở trang hồ sơ trước.";
        }
        return null;
    }

    private VerificationReviewResponse toContext(Submission submission) {
        FieldAssignment assignment = latestAssignment(submission);
        String blockedReason = blockedReasonOf(submission, assignment);
        Category category = submission.getCategory();
        return new VerificationReviewResponse(
                trackingService.getForStaff(submission.getTrackingCode()),
                submission.getPriority(),
                submission.getImpactScore(),
                category == null ? null : category.getName(),
                category == null || category.getDeputyEic() == null ? null : category.getDeputyEic().getFullName(),
                reporterOf(submission),
                assignmentOf(assignment),
                reportOf(assignment),
                screeningOf(submission),
                blockedReason == null,
                blockedReason,
                reviewOf(submission));
    }

    private VerificationReviewResponse.Reporter reporterOf(Submission submission) {
        User author = submission.getAuthor();
        if (Boolean.TRUE.equals(submission.getIsAnonymous()) || author == null) {
            return null;
        }
        return new VerificationReviewResponse.Reporter(author.getFullName(), author.getRole(), author.getReputationScore());
    }

    private VerificationReviewResponse.Assignment assignmentOf(FieldAssignment assignment) {
        if (assignment == null) {
            return null;
        }
        User contributor = assignment.getContributor();
        Submission output = assignment.getOutputSubmission();
        var submittedAt = output == null ? null : output.getCreatedAt();
        Boolean onTime = submittedAt == null || assignment.getDeadline() == null
                ? null
                : !submittedAt.isAfter(assignment.getDeadline());
        return new VerificationReviewResponse.Assignment(
                assignment.getTitle(),
                assignment.getAssignmentMode(),
                assignment.getStatus(),
                contributor == null ? null : contributor.getId(),
                contributor == null ? null : contributor.getFullName(),
                contributor == null ? null : contributor.performanceScoreOrDefault(),
                assignment.getCreatedAt(),
                assignment.getDeadline(),
                submittedAt,
                onTime);
    }

    private VerificationReviewResponse.Report reportOf(FieldAssignment assignment) {
        if (assignment == null || assignment.getOutputSubmission() == null) {
            return null;
        }
        Submission output = assignment.getOutputSubmission();
        List<VerificationReviewResponse.FieldEvidence> evidences = evidenceRepository.findBySubmissionOrderByIdAsc(output)
                .stream()
                .map(this::fieldEvidenceOf)
                .toList();
        FieldReport report = fieldReportRepository.findByAssignmentId(assignment.getId()).orElse(null);
        return new VerificationReviewResponse.Report(output.getTitle(), output.getSummary(), output.getContent(),
                output.getCreatedAt(), evidences,
                report == null ? null : report.getConclusion(),
                report == null ? null : report.getFindings(),
                report == null ? null : report.getWitnessStatements(),
                report == null ? null : report.getRecommendation());
    }

    /**
     * Đọc metadata JSON của tệp. Tên gốc + dung lượng luôn có (SubmissionService ghi khi tải lên); toạ độ, giờ chụp,
     * thiết bị chỉ có khi lúc tải lên có ghi thêm các khoá latitude / longitude / capturedAt / device.
     * path("x") không có thì trả về nút rỗng (không lỗi), isNumber() để bỏ qua giá trị sai kiểu.
     */
    private VerificationReviewResponse.FieldEvidence fieldEvidenceOf(Evidence evidence) {
        JsonNode metadata = objectMapper.readTree(evidence.getMetadata() == null ? "{}" : evidence.getMetadata());
        if (metadata.isString()) {
            metadata = objectMapper.readTree(metadata.asString()); // CSDL trả JSON dạng chuỗi bọc ngoài -> đọc thêm 1 lần
        }
        JsonNode latitude = metadata.path("latitude");
        JsonNode longitude = metadata.path("longitude");
        boolean hasGps = latitude.isNumber() && longitude.isNumber();
        return new VerificationReviewResponse.FieldEvidence(
                metadata.path("originalName").asString("tep-dinh-kem"),
                evidence.getFileType(),
                metadata.path("size").asLong(0),
                evidence.getFileUrl(),
                hasGps ? latitude.asDouble() : null,
                hasGps ? longitude.asDouble() : null,
                TextUtils.blankToNull(metadata.path("capturedAt").asString(null)),
                TextUtils.blankToNull(metadata.path("device").asString(null)));
    }

    private VerificationReviewResponse.Screening screeningOf(Submission submission) {
        Submission duplicate = submission.getDuplicateSubmission();
        return new VerificationReviewResponse.Screening(
                Boolean.TRUE.equals(submission.getIsSpam()),
                duplicate == null ? null : duplicate.getTrackingCode(),
                submission.getAiSummary());
    }

    /** Lần duyệt kết quả xác minh gần nhất: editorial_reviews APPROVE của EDITOR có mã đánh dấu. */
    private VerificationReviewResponse.Review reviewOf(Submission submission) {
        return reviewRepository
                .findFirstBySubmissionAndActionOrderByCreatedAtDescIdDesc(submission, EditoralReview.ReviewAction.APPROVE)
                .filter(review -> review.getReviewRole() == EditoralReview.ReviewRole.EDITOR)
                .filter(review -> review.getComments() != null && review.getComments().startsWith(COMMENT_MARKER))
                .map(review -> new VerificationReviewResponse.Review(
                        review.getCreatedAt(),
                        review.getReviewer() == null ? null : review.getReviewer().getFullName(),
                        review.getComments().substring(COMMENT_MARKER.length()).strip()))
                .orElse(null);
    }
}
