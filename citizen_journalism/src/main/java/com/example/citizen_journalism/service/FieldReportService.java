package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.assignment.AdditionalEvidenceRequest;
import com.example.citizen_journalism.dto.assignment.FieldReportView;
import com.example.citizen_journalism.dto.assignment.ReportFeedbackView;
import com.example.citizen_journalism.dto.assignment.SubmitFieldReportRequest;
import com.example.citizen_journalism.dto.assignment.UpdateReportArticleRequest;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.FieldReportFeedback;
import com.example.citizen_journalism.entity.FieldReportFeedback.ReviewStatus;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.FieldAssignmentRepository;
import com.example.citizen_journalism.repository.FieldReportFeedbackRepository;
import com.example.citizen_journalism.repository.FieldReportRepository;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

/**
 * BÁO CÁO HIỆN TRƯỜNG: lưu báo cáo CTV nộp và đọc lại cho CTV (ContributorTaskService), Biên tập viên (FieldAssignmentService).
 *
 * Khi CTV nộp, dữ liệu nằm ở 2 nơi:
 *   - field_reports : kết luận xác minh, kết quả hiện trường, lời nhân chứng, đề xuất.
 *   - submissions   : hồ sơ ĐẦU RA loại CONTRIBUTOR_POST chứa bài viết nháp + tư liệu CTV (FieldAssignment.outputSubmission).
 *
 * TẠI SAO tách hồ sơ đầu ra khỏi hồ sơ gốc? Người gửi tin tra cứu hồ sơ gốc sẽ thấy mọi tư liệu của hồ sơ đó,
 * nên tư liệu của CTV phải nằm riêng để không lộ cho họ. Hồ sơ đầu ra không có mã tra cứu và không hiện ở hàng đợi.
 *
 * Điểm hiệu suất đổi ngay khi nộp: đúng hạn được cộng, trễ hạn bị trừ, có ghi vào reputation_logs.
 *
 * VÒNG PHẢN HỒI sau khi nộp (mỗi lúc chỉ có 1 yêu cầu đang chờ):
 *   Biên tập viên yêu cầu sửa bài  -> CTV sửa bài         -> quay lại chờ Biên tập viên xem
 *   Biên tập viên yêu cầu tư liệu  -> CTV bổ sung tư liệu -> quay lại chờ Biên tập viên xem
 *   Biên tập viên duyệt            -> kết thúc, không sửa được nữa
 * Trong lúc chờ CTV, hồ sơ đầu ra ở trạng thái NEED_MORE_INFO.
 */
@Service
@RequiredArgsConstructor
public class FieldReportService {

    /** Muốn đổi mức thưởng / phạt chỉ cần sửa 2 số này. */
    private static final int ON_TIME_POINTS = 5;
    private static final int LATE_POINTS = -5;

    private final FieldReportRepository reportRepository;
    private final SubmissionRepository submissionRepository;
    private final EvidenceRepository evidenceRepository;
    private final ReputationLogRepository reputationLogRepository;
    private final FieldAssignmentRepository assignmentRepository;
    private final FieldReportFeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final SubmissionService submissionService;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    /** Lưu báo cáo + bài viết + tư liệu rồi đổi điểm. Việc kiểm tra quyền và trạng thái nhiệm vụ do nơi gọi đảm nhận. */
    public void create(FieldAssignment task, SubmitFieldReportRequest request, List<MultipartFile> files) {
        List<MultipartFile> evidenceFiles = files == null ? List.of() : files;
        checkFiles(evidenceFiles);

        Submission original = task.getSubmission();
        User contributor = task.getContributor();
        Submission article = submissionRepository.save(Submission.builder()
                .type(Submission.SubmissionType.CONTRIBUTOR_POST)
                .author(contributor)
                .assignedEditor(task.getCreatedBy())
                .title(request.title().trim())
                .content(request.content().trim())
                .incidentAt(original.getIncidentAt())
                .province(original.getProvince())
                .address(original.getAddress())
                .status(Submission.SubmissionStatus.IN_REVIEW)
                .build());
        submissionService.saveEvidences(article, contributor, original.getTrackingCode() + "-BC", evidenceFiles);
        task.setOutputSubmission(article);

        reportRepository.save(FieldReport.builder()
                .assignment(task)
                .conclusion(request.conclusion())
                .findings(request.findings().trim())
                .witnessStatements(request.witnessStatements().trim())
                .recommendation(request.recommendation())
                .build());
        updatePerformance(task);
    }

    /** Báo cáo của 1 nhiệm vụ; null nếu nhiệm vụ chưa có báo cáo. */
    public FieldReportView getView(FieldAssignment task) {
        return reportRepository.findByAssignmentId(task.getId()).map(report -> toView(task, report)).orElse(null);
    }

    /** Trạng thái xem xét của các nhiệm vụ đã có báo cáo (nhiệm vụ chưa có báo cáo không nằm trong kết quả), cho các danh sách. */
    public Map<Long, ReviewStatus> reviewStatuses(List<Long> assignmentIds) {
        Map<Long, ReviewStatus> statuses = new HashMap<>();
        if (assignmentIds.isEmpty()) {
            return statuses;
        }
        reportRepository.findByAssignmentIdIn(assignmentIds)
                .forEach(report -> statuses.put(report.getAssignment().getId(), ReviewStatus.PENDING_REVIEW));
        // Phản hồi xếp từ cũ đến mới nên dòng mới nhất của mỗi nhiệm vụ ghi đè các dòng trước
        feedbacksOf(assignmentIds).forEach(feedback ->
                statuses.put(feedback.getReport().getAssignment().getId(), ReviewStatus.of(feedback)));
        return statuses;
    }

    /** Phản hồi của nhiều nhiệm vụ, từ cũ đến mới, cho lịch sử nhiệm vụ. */
    public List<FieldReportFeedback> feedbacksOf(List<Long> assignmentIds) {
        return assignmentIds.isEmpty() ? List.of() : feedbackRepository.findByReportAssignmentIdInOrderByIdAsc(assignmentIds);
    }

    // ================ BIÊN TẬP VIÊN PHẢN HỒI ================

    /** Yêu cầu CTV sửa bài viết hoặc bổ sung tư liệu. CTV nhận email kèm nội dung yêu cầu. */
    @Transactional
    public FieldReportView request(String editorId, Long assignmentId, FieldReportFeedback.Type type, String message) {
        FieldAssignment task = findTask(assignmentId);
        FieldReport report = findWaitingReport(task);
        task.getOutputSubmission().setStatus(Submission.SubmissionStatus.NEED_MORE_INFO);
        saveFeedback(report, editorId, type, message.trim());
        String action = type == FieldReportFeedback.Type.REQUEST_REVISION ? "sửa bài viết" : "bổ sung tư liệu";
        notifyContributor(task, "Toà soạn yêu cầu " + action, MailService.box("Yêu cầu: " + MailService.escape(message.trim())));
        return getView(task);
    }

    /** Duyệt báo cáo. Sau bước này CTV không sửa được nữa. */
    @Transactional
    public FieldReportView approve(String editorId, Long assignmentId) {
        FieldAssignment task = findTask(assignmentId);
        saveFeedback(findWaitingReport(task), editorId, FieldReportFeedback.Type.APPROVED, null);
        notifyContributor(task, "Toà soạn đã duyệt báo cáo", "");
        return getView(task);
    }

    // ================ CỘNG TÁC VIÊN XỬ LÝ YÊU CẦU ================

    /** Sửa bài viết theo yêu cầu. Việc kiểm tra quyền sở hữu nhiệm vụ do nơi gọi đảm nhận. */
    public void updateArticle(FieldAssignment task, UpdateReportArticleRequest request) {
        FieldReportFeedback feedback = findOpenFeedback(task, FieldReportFeedback.Type.REQUEST_REVISION);
        Submission article = task.getOutputSubmission();
        article.setTitle(request.title().trim());
        article.setContent(request.content().trim());
        resolve(task, feedback, request.note(), "sửa bài viết");
    }

    /** Bổ sung tư liệu theo yêu cầu. Việc kiểm tra quyền sở hữu nhiệm vụ do nơi gọi đảm nhận. */
    public void addEvidence(FieldAssignment task, AdditionalEvidenceRequest request, List<MultipartFile> files) {
        FieldReportFeedback feedback = findOpenFeedback(task, FieldReportFeedback.Type.REQUEST_EVIDENCE);
        List<MultipartFile> evidenceFiles = files == null ? List.of() : files;
        checkFiles(evidenceFiles);
        submissionService.saveEvidences(task.getOutputSubmission(), task.getContributor(),
                task.getSubmission().getTrackingCode() + "-BC", evidenceFiles);
        resolve(task, feedback, request.note(), "bổ sung tư liệu");
    }

    // ================================ HÀM PHỤ ================================

    private FieldAssignment findTask(Long assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy nhiệm vụ."));
    }

    private FieldReport findReport(FieldAssignment task) {
        return reportRepository.findByAssignmentId(task.getId())
                .orElseThrow(() -> AppException.notFound("Nhiệm vụ này chưa có báo cáo."));
    }

    private FieldReportFeedback latestFeedback(FieldReport report) {
        return feedbackRepository.findTopByReportIdOrderByIdDesc(report.getId()).orElse(null);
    }

    /** Báo cáo đang chờ Biên tập viên xem; đang chờ CTV xử lý hoặc đã duyệt thì không phản hồi thêm được. */
    private FieldReport findWaitingReport(FieldAssignment task) {
        FieldReport report = findReport(task);
        if (ReviewStatus.of(latestFeedback(report)) != ReviewStatus.PENDING_REVIEW) {
            throw AppException.conflict("Báo cáo này không ở trạng thái chờ xem xét.");
        }
        return report;
    }

    /** Yêu cầu đang chờ CTV xử lý, phải đúng loại: chỉ được sửa / bổ sung khi toà soạn yêu cầu. */
    private FieldReportFeedback findOpenFeedback(FieldAssignment task, FieldReportFeedback.Type type) {
        FieldReportFeedback latest = latestFeedback(findReport(task));
        if (latest == null || !latest.isOpen() || latest.getType() != type) {
            throw AppException.conflict("Toà soạn không có yêu cầu này cho báo cáo của bạn.");
        }
        return latest;
    }

    private void saveFeedback(FieldReport report, String editorId, FieldReportFeedback.Type type, String message) {
        feedbackRepository.save(FieldReportFeedback.builder()
                .report(report)
                .editor(userRepository.getActiveById(editorId))
                .type(type)
                .message(message)
                .build());
    }

    /** Đóng yêu cầu, đưa báo cáo về chờ Biên tập viên xem lại và báo cho Biên tập viên đã yêu cầu. */
    private void resolve(FieldAssignment task, FieldReportFeedback feedback, String note, String action) {
        feedback.setResponse(blankToNull(note));
        feedback.setResolvedAt(LocalDateTime.now());
        task.getOutputSubmission().setStatus(Submission.SubmissionStatus.IN_REVIEW);

        User editor = feedback.getEditor();
        Submission submission = task.getSubmission();
        String reply = feedback.getResponse() == null ? "" : MailService.box("Lời nhắn: " + MailService.escape(feedback.getResponse()));
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Cộng tác viên <b>%s</b> đã %s cho hồ sơ <b>%s</b>: %s.</p>
                  %s
                  <p>Bạn có thể mở hồ sơ để xem lại báo cáo.</p>
                """.formatted(MailService.escape(editor.getFullName()), MailService.escape(task.getContributor().getFullName()),
                action, MailService.escape(submission.getTrackingCode()), MailService.escape(submission.getTitle()), reply));
        mailService.trySend(editor.getEmail(), "[Tin Nóng Dân Sinh] Cộng tác viên đã " + action, html);
    }

    /** Email báo CTV có phản hồi mới. Mail lỗi không làm hỏng thao tác của Biên tập viên. */
    private void notifyContributor(FieldAssignment task, String subject, String detail) {
        User contributor = task.getContributor();
        Submission submission = task.getSubmission();
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>%s cho hồ sơ <b>%s</b>: %s.</p>
                  %s
                  <p>Vui lòng đăng nhập và mở mục Nhiệm vụ của tôi để xem chi tiết.</p>
                """.formatted(MailService.escape(contributor.getFullName()), subject,
                MailService.escape(submission.getTrackingCode()), MailService.escape(submission.getTitle()), detail));
        mailService.trySend(contributor.getEmail(), "[Tin Nóng Dân Sinh] " + subject, html);
    }

    private void checkFiles(List<MultipartFile> files) {
        Map<String, String> errors = new LinkedHashMap<>();
        submissionService.checkEvidenceFiles(files, errors);
        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }
    }

    /** Cộng / trừ điểm theo thời điểm nộp. Điểm không xuống dưới 0. */
    private void updatePerformance(FieldAssignment task) {
        User contributor = task.getContributor();
        boolean late = LocalDateTime.now().isAfter(task.getDeadline());
        int points = late ? LATE_POINTS : ON_TIME_POINTS;
        contributor.setPerformanceScore(Math.max(0, contributor.performanceScoreOrDefault() + points));
        reputationLogRepository.save(ReputationLog.builder()
                .user(contributor)
                .pointsChange(points)
                .reason(late ? ReputationLog.ReputationReason.TASK_LATE : ReputationLog.ReputationReason.TASK_COMPLETED_ON_TIME)
                .relatedSubmission(task.getSubmission())
                .build());
    }

    private FieldReportView toView(FieldAssignment task, FieldReport report) {
        Submission article = task.getOutputSubmission();
        List<EvidenceInfo> evidences = evidenceRepository.findBySubmissionOrderByIdAsc(article).stream()
                .map(evidence -> EvidenceInfo.from(evidence, objectMapper))
                .toList();
        List<FieldReportFeedback> feedbacks = feedbackRepository.findByReportIdOrderByIdAsc(report.getId());
        ReviewStatus reviewStatus = ReviewStatus.of(feedbacks.isEmpty() ? null : feedbacks.get(feedbacks.size() - 1));
        return new FieldReportView(report.getConclusion(), report.getFindings(), report.getWitnessStatements(),
                report.getRecommendation(), article.getTitle(), article.getContent(), evidences, report.getCreatedAt(),
                report.getCreatedAt().isAfter(task.getDeadline()), reviewStatus,
                feedbacks.stream().map(ReportFeedbackView::from).toList());
    }
}
