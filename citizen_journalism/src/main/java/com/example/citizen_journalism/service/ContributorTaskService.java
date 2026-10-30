package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.assignment.ContributorTaskDetail;
import com.example.citizen_journalism.dto.assignment.ContributorTaskItem;
import com.example.citizen_journalism.dto.assignment.SubmitFieldReportRequest;
import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldAssignment.AssignmentStatus;
import com.example.citizen_journalism.entity.FieldAssignment.CancelType;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.FieldAssignmentRepository;
import com.example.citizen_journalism.util.Paging;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

/**
 * NHIỆM VỤ XÁC MINH phía CỘNG TÁC VIÊN (ContributorTaskController, frontend /contributor/tasks).
 * Biên tập viên giao việc ở FieldAssignmentService; từ đó nhiệm vụ đi tiếp ở đây:
 *
 *   ASSIGNED (chờ phản hồi) --nhận----> ACCEPTED (đang làm) --nộp báo cáo--> COMPLETED
 *            |                                   |
 *            |                                   +--------huỷ--> CANCELLED
 *            +-------------từ chối----> CANCELLED
 *
 * Từ chối và huỷ đều bắt buộc có lý do, Biên tập viên nhận email để giao cho người khác.
 * Mọi thao tác chỉ áp dụng cho nhiệm vụ CỦA CHÍNH CTV đó: nhiệm vụ của người khác trả về 404
 * như không tồn tại, để không ai dò được id nhiệm vụ.
 */
@Service
@RequiredArgsConstructor
public class ContributorTaskService {

    /** Nội dung chi tiết và tư liệu chỉ mở sau khi CTV nhận việc: người từ chối không cần thấy nguồn tin. */
    private static final Set<AssignmentStatus> CONTENT_VISIBLE_STATUSES = EnumSet.of(AssignmentStatus.ACCEPTED, AssignmentStatus.COMPLETED);

    private final FieldAssignmentRepository assignmentRepository;
    private final EvidenceRepository evidenceRepository;
    private final SubmissionEventService submissionEventService;
    private final FieldReportService fieldReportService;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    /** Danh sách nhiệm vụ của CTV, mới nhất trước. status = null: mọi trạng thái. */
    @Transactional(readOnly = true)
    public PageResponse<ContributorTaskItem> list(String contributorId, AssignmentStatus status, int page, int size) {
        Set<AssignmentStatus> statuses = status == null ? EnumSet.allOf(AssignmentStatus.class) : EnumSet.of(status);
        return PageResponse.from(assignmentRepository
                .findByContributorIdAndStatusIn(contributorId, statuses, Paging.of(page, size, Paging.NEWEST_FIRST))
                .map(ContributorTaskItem::from));
    }

    /** Số nhiệm vụ theo từng trạng thái, hiện cạnh các thẻ lọc. */
    @Transactional(readOnly = true)
    public Map<AssignmentStatus, Long> countByStatus(String contributorId) {
        Map<AssignmentStatus, Long> counts = new EnumMap<>(AssignmentStatus.class);
        assignmentRepository.countByContributors(List.of(contributorId))
                .forEach(row -> counts.put(row.getStatus(), row.getTotal()));
        return counts;
    }

    @Transactional(readOnly = true)
    public ContributorTaskDetail get(String contributorId, Long taskId) {
        return toDetail(findTask(contributorId, taskId));
    }

    /** Nhận nhiệm vụ: ghi vào nhật ký hồ sơ để người gửi biết đã có người đi xác minh (không lộ tên CTV). */
    @Transactional
    public ContributorTaskDetail accept(String contributorId, Long taskId) {
        FieldAssignment task = findWaitingTask(contributorId, taskId);
        if (task.getDeadline().isBefore(LocalDateTime.now())) {
            throw AppException.conflict("Nhiệm vụ này đã quá hạn, không thể nhận.");
        }
        task.setStatus(AssignmentStatus.ACCEPTED);
        task.setClaimedAt(LocalDateTime.now());

        Submission submission = task.getSubmission();
        submissionEventService.record(submission, submission.getStatus(), SubmissionEvent.Actor.CONTRIBUTOR,
                "Cộng tác viên đã nhận nhiệm vụ và sẽ xác minh tại hiện trường.", null);
        return toDetail(task);
    }

    /** Từ chối nhiệm vụ đang chờ phản hồi. */
    @Transactional
    public ContributorTaskDetail decline(String contributorId, Long taskId, String reason) {
        FieldAssignment task = findWaitingTask(contributorId, taskId);
        task.cancel(CancelType.DECLINED, reason.trim(), task.getContributor());
        notifyEditor(task, "từ chối");
        return toDetail(task);
    }

    /** Huỷ nhiệm vụ đã nhận, khi CTV không thể tiếp tục. */
    @Transactional
    public ContributorTaskDetail cancel(String contributorId, Long taskId, String reason) {
        FieldAssignment task = findTask(contributorId, taskId);
        if (task.getStatus() != AssignmentStatus.ACCEPTED) {
            throw AppException.conflict("Chỉ huỷ được nhiệm vụ đang thực hiện.");
        }
        task.cancel(CancelType.CONTRIBUTOR_CANCELLED, reason.trim(), task.getContributor());
        notifyEditor(task, "huỷ");
        return toDetail(task);
    }

    /**
     * Nộp báo cáo hiện trường, kết thúc nhiệm vụ. Trễ hạn vẫn nộp được nhưng bị trừ điểm (FieldReportService).
     * Hồ sơ gốc giữ nguyên trạng thái để Biên tập viên xem báo cáo rồi xử lý tiếp.
     */
    @Transactional
    public ContributorTaskDetail submitReport(String contributorId, Long taskId, SubmitFieldReportRequest request,
                                              List<MultipartFile> files) {
        FieldAssignment task = findTask(contributorId, taskId);
        if (task.getStatus() != AssignmentStatus.ACCEPTED) {
            throw AppException.conflict("Chỉ nộp báo cáo cho nhiệm vụ đang thực hiện.");
        }
        fieldReportService.create(task, request, files);
        task.setStatus(AssignmentStatus.COMPLETED);

        Submission submission = task.getSubmission();
        submissionEventService.record(submission, submission.getStatus(), SubmissionEvent.Actor.CONTRIBUTOR,
                "Cộng tác viên đã nộp báo cáo xác minh hiện trường.", null);
        notifyReportSubmitted(task);
        return toDetail(task);
    }

    // ================================ HÀM PHỤ ================================

    private FieldAssignment findTask(String contributorId, Long taskId) {
        return assignmentRepository.findByIdAndContributorId(taskId, contributorId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy nhiệm vụ."));
    }

    /** Nhiệm vụ đang chờ CTV phản hồi; đã phản hồi rồi hoặc đã bị thu hồi thì báo 409. */
    private FieldAssignment findWaitingTask(String contributorId, Long taskId) {
        FieldAssignment task = findTask(contributorId, taskId);
        if (task.getStatus() != AssignmentStatus.ASSIGNED) {
            throw AppException.conflict("Nhiệm vụ này không còn chờ bạn phản hồi.");
        }
        return task;
    }

    private ContributorTaskDetail toDetail(FieldAssignment task) {
        if (!CONTENT_VISIBLE_STATUSES.contains(task.getStatus())) {
            return ContributorTaskDetail.from(task, null, List.of(), null);
        }
        Submission submission = task.getSubmission();
        List<EvidenceInfo> evidences = evidenceRepository.findBySubmissionOrderByIdAsc(submission).stream()
                .map(evidence -> EvidenceInfo.from(evidence, objectMapper))
                .toList();
        return ContributorTaskDetail.from(task, submission.getContent(), evidences, fieldReportService.getView(task));
    }

    /** Báo Biên tập viên đã giao việc: đã có báo cáo để xem. */
    private void notifyReportSubmitted(FieldAssignment task) {
        User editor = task.getCreatedBy();
        Submission submission = task.getSubmission();
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Cộng tác viên <b>%s</b> đã nộp báo cáo xác minh hồ sơ <b>%s</b>: %s.</p>
                  <p>Bạn có thể mở hồ sơ để xem báo cáo và bài viết nháp.</p>
                """.formatted(MailService.escape(editor.getFullName()), MailService.escape(task.getContributor().getFullName()),
                MailService.escape(submission.getTrackingCode()), MailService.escape(submission.getTitle())));
        mailService.trySend(editor.getEmail(), "[Tin Nóng Dân Sinh] Cộng tác viên đã nộp báo cáo", html);
    }

    /** Báo Biên tập viên đã giao việc: CTV từ chối / huỷ thì cần giao cho người khác. Mail lỗi không làm hỏng thao tác. */
    private void notifyEditor(FieldAssignment task, String action) {
        User editor = task.getCreatedBy();
        Submission submission = task.getSubmission();
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Cộng tác viên <b>%s</b> đã %s nhiệm vụ xác minh hồ sơ <b>%s</b>: %s.</p>
                  %s
                  <p>Bạn có thể mở hồ sơ để giao cho Cộng tác viên khác.</p>
                """.formatted(MailService.escape(editor.getFullName()), MailService.escape(task.getContributor().getFullName()),
                action, MailService.escape(submission.getTrackingCode()), MailService.escape(submission.getTitle()),
                MailService.box("Lý do: " + MailService.escape(task.getCancelReason()))));
        mailService.trySend(editor.getEmail(), "[Tin Nóng Dân Sinh] Cộng tác viên " + action + " nhiệm vụ", html);
    }
}
