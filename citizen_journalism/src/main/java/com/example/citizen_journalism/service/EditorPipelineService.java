package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.EditorPipeline;
import com.example.citizen_journalism.dto.editor.EditorPipeline.Column;
import com.example.citizen_journalism.dto.editor.EditorPipeline.Stage;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldAssignment.AssignmentStatus;
import com.example.citizen_journalism.entity.FieldReportFeedback.ReviewStatus;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.repository.FieldAssignmentRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TIẾN ĐỘ TOÀ SOẠN: cho Biên tập viên nhìn một lượt mọi hồ sơ tin nóng, khiếu nại đang nằm ở bước nào.
 * Luồng gọi: routes/editor/EditorPipeline.jsx -> editorService.getPipeline -> EditorController -> đây.
 *
 * Chỉ đọc dữ liệu, không đổi trạng thái hồ sơ. Muốn xử lý thì bấm vào thẻ để sang trang chi tiết hồ sơ.
 *
 * TẠI SAO không lưu "bước" vào DB? Bước được suy ra từ trạng thái hồ sơ cộng với nhiệm vụ mới nhất,
 * nên luôn đúng với dữ liệu thật và không cần sửa ở mọi nơi đổi trạng thái.
 * Việc xếp cột làm bằng Java vì 1 trạng thái IN_REVIEW còn phải xem nhiệm vụ để biết thuộc cột nào.
 * Hồ sơ đã kết thúc (đã đăng, từ chối, huỷ, gỡ) không còn trên bảng nên số dòng phải đọc luôn ở mức nhỏ.
 */
@Service
@RequiredArgsConstructor
public class EditorPipelineService {

    /** Mỗi cột chỉ trả từng này thẻ; số còn lại thể hiện qua Column.total. */
    private static final int MAX_CARDS_PER_COLUMN = 30;

    /** Các trạng thái còn đang xử lý, tức còn hiện trên bảng. */
    private static final Set<SubmissionStatus> OPEN_STATUSES = EnumSet.of(
            SubmissionStatus.PENDING,
            SubmissionStatus.IN_REVIEW,
            SubmissionStatus.NEED_MORE_INFO,
            SubmissionStatus.DEPUTY_REJECTED,
            SubmissionStatus.DEPUTY_PENDING,
            SubmissionStatus.EIC_PENDING,
            SubmissionStatus.READY_FOR_PUBLISHING);

    /** Nhiệm vụ CTV chưa làm xong. */
    private static final Set<AssignmentStatus> RUNNING_STATUSES = EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED);

    private final SubmissionRepository submissionRepository;
    private final FieldAssignmentRepository assignmentRepository;
    private final FieldReportService fieldReportService;

    /** @param category lọc theo loại phản ánh; null = mọi loại */
    @Transactional(readOnly = true)
    public EditorPipeline get(Submission.ReportCategory category) {
        List<Submission> submissions = submissionRepository.findForPipeline(OPEN_STATUSES, category);
        Map<Long, FieldAssignment> tasks = latestTasksOf(submissions);
        Map<Long, ReviewStatus> reviews = fieldReportService.reviewStatuses(
                tasks.values().stream().map(FieldAssignment::getId).toList());

        Map<Stage, List<Submission>> stages = submissions.stream().collect(Collectors.groupingBy(
                submission -> stageOf(submission, tasks.get(submission.getId())),
                () -> new EnumMap<>(Stage.class),
                Collectors.toList()));
        List<Column> columns = Arrays.stream(Stage.values())
                .map(stage -> toColumn(stage, stages.getOrDefault(stage, List.of()), tasks, reviews))
                .toList();

        LocalDateTime now = LocalDateTime.now();
        long overdueTasks = tasks.values().stream()
                .filter(task -> RUNNING_STATUSES.contains(task.getStatus()) && task.getDeadline().isBefore(now))
                .count();
        return new EditorPipeline(columns, submissions.size(), overdueTasks);
    }

    // ================================ HÀM PHỤ ================================

    /** Nhiệm vụ mới nhất của từng hồ sơ, theo id hồ sơ. Hồ sơ chưa từng giao CTV không có trong kết quả. */
    private Map<Long, FieldAssignment> latestTasksOf(List<Submission> submissions) {
        if (submissions.isEmpty()) {
            return Map.of();
        }
        return assignmentRepository.findLatestBySubmissions(submissions).stream()
                .collect(Collectors.toMap(task -> task.getSubmission().getId(), Function.identity()));
    }

    /**
     * Hồ sơ đang ở bước nào. Hồ sơ IN_REVIEW xét thêm nhiệm vụ mới nhất:
     * CTV đang làm -> xác minh; CTV đã nộp -> chờ xem báo cáo; chưa giao hoặc nhiệm vụ đã huỷ -> thẩm định.
     * Hồ sơ bị Phó TBT trả về (DEPUTY_REJECTED) quay lại tay Biên tập viên nên cũng thuộc bước thẩm định.
     *
     * @param task nhiệm vụ mới nhất; null nếu chưa từng giao
     */
    private static Stage stageOf(Submission submission, FieldAssignment task) {
        return switch (submission.getStatus()) {
            case PENDING -> Stage.RECEIVED;
            case NEED_MORE_INFO -> Stage.NEED_INFO;
            case DEPUTY_PENDING, EIC_PENDING -> Stage.LEADERSHIP;
            case READY_FOR_PUBLISHING -> Stage.READY_TO_PUBLISH;
            case IN_REVIEW -> {
                if (task != null && RUNNING_STATUSES.contains(task.getStatus())) {
                    yield Stage.FIELD_WORK;
                }
                yield task != null && task.getStatus() == AssignmentStatus.COMPLETED ? Stage.REPORT_REVIEW : Stage.SCREENING;
            }
            default -> Stage.SCREENING;
        };
    }

    private static Column toColumn(Stage stage, List<Submission> submissions, Map<Long, FieldAssignment> tasks,
                                   Map<Long, ReviewStatus> reviews) {
        List<EditorPipeline.Card> cards = submissions.stream()
                .limit(MAX_CARDS_PER_COLUMN)
                .map(submission -> {
                    FieldAssignment task = tasks.get(submission.getId());
                    return EditorPipeline.Card.from(submission,
                            task == null ? null : EditorPipeline.Task.from(task, reviews.get(task.getId())));
                })
                .toList();
        return new Column(stage, submissions.size(), cards);
    }
}
