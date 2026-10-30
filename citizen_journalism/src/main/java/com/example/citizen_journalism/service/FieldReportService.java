package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.assignment.FieldReportView;
import com.example.citizen_journalism.dto.assignment.SubmitFieldReportRequest;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.FieldReportRepository;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
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
    private final SubmissionService submissionService;
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

    // ================================ HÀM PHỤ ================================

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
        return new FieldReportView(report.getConclusion(), report.getFindings(), report.getWitnessStatements(),
                report.getRecommendation(), article.getTitle(), article.getContent(), evidences, report.getCreatedAt(),
                report.getCreatedAt().isAfter(task.getDeadline()));
    }
}
