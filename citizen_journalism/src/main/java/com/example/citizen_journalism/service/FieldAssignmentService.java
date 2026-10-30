package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.assignment.AssignContributorRequest;
import com.example.citizen_journalism.dto.assignment.AssignmentHistoryEntry;
import com.example.citizen_journalism.dto.assignment.AssignmentHistoryEntry.Type;
import com.example.citizen_journalism.dto.assignment.AssignmentView;
import com.example.citizen_journalism.dto.assignment.ContributorCandidate;
import com.example.citizen_journalism.dto.assignment.FieldReportView;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldAssignment.AssignmentStatus;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.FieldAssignmentRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.Paging;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * GIAO NHIỆM VỤ XÁC MINH HIỆN TRƯỜNG cho Cộng tác viên (FieldAssignmentController, frontend /editor/assignments...).
 *
 *   - getCandidates : danh sách CTV để chọn: lọc theo tỉnh, phường/xã, địa chỉ / tên, điểm hiệu suất
 *                     và sắp xếp. Mặc định ưu tiên CTV cùng khu vực với nơi xảy ra vụ việc.
 *   - assign        : giao đích danh 1 CTV, kèm hạn hoàn thành và chỉ dẫn; hồ sơ chuyển sang IN_REVIEW (Đang thẩm định).
 *   - list / getLatest : theo dõi các nhiệm vụ đã giao (mỗi hồ sơ 1 dòng, là nhiệm vụ mới nhất).
 *   - getHistory    : toàn bộ diễn biến nhiệm vụ của 1 hồ sơ: giao cho ai, ai nhận, ai từ chối, lý do.
 *   - getReport     : xem báo cáo hiện trường CTV đã nộp.
 *   - cancel        : thu hồi nhiệm vụ đang hiệu lực (ví dụ CTV không phản hồi) để giao cho người khác.
 * Phần CTV nhận / từ chối / huỷ nằm ở ContributorTaskService.
 *
 * TẠI SAO lọc + sắp xếp trong Java? Thứ tự "phù hợp nhất" dựa trên số nhiệm vụ đang làm và cùng khu vực hay không,
 * viết bằng SQL sẽ rất dài. Số CTV của một toà soạn không lớn, tải về rồi sắp xếp vẫn nhanh và dễ đọc hơn.
 */
@Service
@RequiredArgsConstructor
public class FieldAssignmentService {

    /** Cách sắp xếp danh sách CTV (frontend gửi lên qua tham số sort). */
    public enum CandidateSort {
        RECOMMENDED, // Phù hợp nhất: cùng khu vực trước, rồi điểm cao, rồi ít việc
        SCORE_DESC,  // Điểm hiệu suất từ cao đến thấp
        SCORE_ASC,   // Điểm hiệu suất từ thấp đến cao
        WORKLOAD     // Ít nhiệm vụ đang làm nhất
    }

    /** Hiện tối đa bao nhiêu CTV trên màn hình chọn. */
    private static final int MAX_CANDIDATES = 60;

    /** Nhiệm vụ đang hiệu lực: chờ CTV phản hồi hoặc CTV đang làm. */
    private static final Set<AssignmentStatus> ACTIVE_STATUSES = EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED);

    /** Chỉ giao nhiệm vụ khi hồ sơ mới tiếp nhận hoặc đang thẩm định. */
    private static final Set<SubmissionStatus> ASSIGNABLE_STATUSES = EnumSet.of(SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW);

    private static final DateTimeFormatter DEADLINE_FORMAT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final FieldAssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final SubmissionEventService submissionEventService;
    private final FieldReportService fieldReportService;
    private final MailService mailService;

    /**
     * Danh sách CTV để chọn.
     *
     * @param trackingCode hồ sơ cần giao (lấy khu vực vụ việc để đánh dấu CTV cùng khu vực)
     * @param province     lọc đúng tỉnh của CTV; null = mọi tỉnh
     * @param ward         lọc đúng phường/xã của CTV; null = mọi phường/xã
     * @param keyword      tìm theo họ tên / địa chỉ; null = không tìm
     * @param minScore     điểm hiệu suất tối thiểu
     */
    @Transactional(readOnly = true)
    public List<ContributorCandidate> getCandidates(String trackingCode, String province, String ward, String keyword,
                                                    int minScore, CandidateSort sort) {
        Submission submission = findSubmission(trackingCode);
        List<User> contributors = userRepository.findContributorCandidates(
                blankToNull(province), blankToNull(ward), blankToNull(keyword), minScore);
        Map<String, Map<AssignmentStatus, Long>> workload = workloadOf(contributors);

        return contributors.stream()
                .map(user -> toCandidate(user, submission.getProvince(), workload.getOrDefault(user.getId(), Map.of())))
                .sorted(comparatorOf(sort))
                .limit(MAX_CANDIDATES)
                .toList();
    }

    /**
     * Giao nhiệm vụ. Mỗi hồ sơ chỉ có 1 nhiệm vụ đang hiệu lực. Hồ sơ chuyển sang "Đang thẩm định" và có thêm
     * 1 dòng nhật ký (người gửi chỉ thấy "Cộng tác viên", không thấy tên). CTV nhận email; mail lỗi không làm hỏng việc giao.
     */
    @Transactional
    public AssignmentView assign(String editorId, AssignContributorRequest request) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = findSubmission(request.trackingCode());
        if (!ASSIGNABLE_STATUSES.contains(submission.getStatus())) {
            throw AppException.conflict("Hồ sơ này đã được xử lý xong, không thể giao nhiệm vụ.");
        }
        if (assignmentRepository.existsBySubmissionIdAndStatusIn(submission.getId(), ACTIVE_STATUSES)) {
            throw AppException.conflict("Hồ sơ này đã được giao cho một Cộng tác viên.");
        }
        User contributor = userRepository.findById(request.contributorId())
                .filter(user -> user.getRole() == User.Role.CONTRIBUTOR && user.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() -> AppException.conflict("Cộng tác viên này không còn hoạt động."));

        FieldAssignment assignment = assignmentRepository.save(FieldAssignment.builder()
                .submission(submission)
                .createdBy(editor)
                .title("Xác minh: " + submission.getTitle())
                .assignmentMode(FieldAssignment.AssignmentMode.DIRECT)
                .contributor(contributor)
                .status(AssignmentStatus.ASSIGNED)
                .deadline(request.deadline())
                .note(blankToNull(request.note()))
                .build());

        submission.setAssignedEditor(editor);
        submissionEventService.record(submission, SubmissionStatus.IN_REVIEW, SubmissionEvent.Actor.EDITOR,
                "Toà soạn đã giao Cộng tác viên xác minh tại hiện trường.", null);
        notifyContributor(assignment);
        return AssignmentView.from(assignment);
    }

    /** Thu hồi nhiệm vụ đang hiệu lực. Hồ sơ giữ nguyên trạng thái để Biên tập viên giao lại. CTV nhận email. */
    @Transactional
    public AssignmentView cancel(String editorId, Long assignmentId, String reason) {
        User editor = userRepository.getActiveById(editorId);
        FieldAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy nhiệm vụ."));
        if (!ACTIVE_STATUSES.contains(assignment.getStatus())) {
            throw AppException.conflict("Nhiệm vụ này đã kết thúc, không thể thu hồi.");
        }
        assignment.cancel(FieldAssignment.CancelType.EDITOR_CANCELLED, reason.trim(), editor);
        notifyCancelled(assignment);
        return AssignmentView.from(assignment);
    }

    /** Danh sách nhiệm vụ, mỗi hồ sơ 1 dòng, mới nhất trước. status = null: mọi trạng thái. */
    @Transactional(readOnly = true)
    public PageResponse<AssignmentView> list(AssignmentStatus status, int page, int size) {
        Set<AssignmentStatus> statuses = status == null ? EnumSet.allOf(AssignmentStatus.class) : EnumSet.of(status);
        return PageResponse.from(assignmentRepository.findLatestPerSubmission(statuses, Paging.of(page, size, Paging.NEWEST_FIRST))
                .map(AssignmentView::from));
    }

    /** Nhiệm vụ mới nhất của 1 hồ sơ; null nếu hồ sơ chưa từng được giao. */
    @Transactional(readOnly = true)
    public AssignmentView getLatest(String trackingCode) {
        return assignmentRepository.findTopBySubmissionTrackingCodeOrderByCreatedAtDescIdDesc(normalize(trackingCode))
                .map(AssignmentView::from)
                .orElse(null);
    }

    /** Báo cáo hiện trường của 1 nhiệm vụ. */
    @Transactional(readOnly = true)
    public FieldReportView getReport(Long assignmentId) {
        FieldAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy nhiệm vụ."));
        FieldReportView report = fieldReportService.getView(assignment);
        if (report == null) {
            throw AppException.notFound("Nhiệm vụ này chưa có báo cáo.");
        }
        return report;
    }

    /** Lịch sử của 1 hồ sơ theo thứ tự thời gian: lúc gửi tới, rồi từng bước của mọi nhiệm vụ đã giao. */
    @Transactional(readOnly = true)
    public List<AssignmentHistoryEntry> getHistory(String trackingCode) {
        Submission submission = findSubmission(trackingCode);
        List<AssignmentHistoryEntry> entries = new ArrayList<>();
        entries.add(new AssignmentHistoryEntry(Type.SUBMITTED, submission.getCreatedAt(), null, null, null, null));
        assignmentRepository.findBySubmissionIdOrderByIdAsc(submission.getId())
                .forEach(assignment -> addHistory(entries, assignment));
        entries.sort(Comparator.comparing(AssignmentHistoryEntry::at));
        return entries;
    }

    // ================================ HÀM PHỤ ================================

    /**
     * Thêm các bước của 1 nhiệm vụ: giao việc, CTV nhận (nếu có), rồi kết thúc (nếu có).
     * Lúc kết thúc lấy từ updatedAt vì nhiệm vụ đã kết thúc thì không còn bị sửa nữa.
     */
    private static void addHistory(List<AssignmentHistoryEntry> entries, FieldAssignment assignment) {
        String contributor = assignment.getContributor().getFullName();
        entries.add(new AssignmentHistoryEntry(Type.ASSIGNED, assignment.getCreatedAt(), assignment.getCreatedBy().getFullName(),
                contributor, assignment.getDeadline(), assignment.getNote()));
        if (assignment.getClaimedAt() != null) {
            entries.add(new AssignmentHistoryEntry(Type.ACCEPTED, assignment.getClaimedAt(), contributor, contributor, null, null));
        }
        if (assignment.getCancelType() != null) {
            User actor = assignment.getCancelledBy() != null ? assignment.getCancelledBy() : assignment.getCreatedBy();
            entries.add(new AssignmentHistoryEntry(Type.valueOf(assignment.getCancelType().name()), assignment.getUpdatedAt(),
                    actor.getFullName(), contributor, null, assignment.getCancelReason()));
        }
        if (assignment.getStatus() == AssignmentStatus.COMPLETED) {
            entries.add(new AssignmentHistoryEntry(Type.COMPLETED, assignment.getUpdatedAt(), contributor, contributor, null, null));
        }
    }

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(normalize(trackingCode))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    private static String normalize(String trackingCode) {
        return trackingCode.trim().toUpperCase(Locale.ROOT);
    }

    /** Gom kết quả đếm thành { mã CTV: { trạng thái: số nhiệm vụ } }. Không có CTV thì khỏi gọi DB. */
    private Map<String, Map<AssignmentStatus, Long>> workloadOf(List<User> contributors) {
        Map<String, Map<AssignmentStatus, Long>> workload = new HashMap<>();
        if (contributors.isEmpty()) {
            return workload;
        }
        assignmentRepository.countByContributors(contributors.stream().map(User::getId).toList())
                .forEach(row -> workload.computeIfAbsent(row.getContributorId(), id -> new HashMap<>())
                        .put(row.getStatus(), row.getTotal()));
        return workload;
    }

    private static ContributorCandidate toCandidate(User user, String incidentProvince, Map<AssignmentStatus, Long> tasks) {
        long active = ACTIVE_STATUSES.stream().mapToLong(status -> tasks.getOrDefault(status, 0L)).sum();
        return new ContributorCandidate(user.getId(), user.getFullName(), user.getAvatarUrl(), user.getProvince(),
                user.getWard(), user.getAddress(), user.performanceScoreOrDefault(), active,
                tasks.getOrDefault(AssignmentStatus.COMPLETED, 0L),
                incidentProvince != null && incidentProvince.equals(user.getProvince()));
    }

    /** Thứ tự danh sách. reversed(): điểm cao trước; cùng khu vực (true) trước. */
    private static Comparator<ContributorCandidate> comparatorOf(CandidateSort sort) {
        Comparator<ContributorCandidate> byScore = Comparator.comparingInt(ContributorCandidate::performanceScore).reversed();
        Comparator<ContributorCandidate> byWorkload = Comparator.comparingLong(ContributorCandidate::activeTasks);
        return switch (sort) {
            case SCORE_DESC -> byScore.thenComparing(byWorkload);
            case SCORE_ASC -> Comparator.comparingInt(ContributorCandidate::performanceScore).thenComparing(byWorkload);
            case WORKLOAD -> byWorkload.thenComparing(byScore);
            case RECOMMENDED -> Comparator.comparing(ContributorCandidate::sameArea).reversed()
                    .thenComparing(byScore).thenComparing(byWorkload);
        };
    }

    /** Email báo CTV có nhiệm vụ mới. Không gửi thông tin liên hệ của người phản ánh. */
    private void notifyContributor(FieldAssignment assignment) {
        Submission submission = assignment.getSubmission();
        User contributor = assignment.getContributor();
        LocalDateTime deadline = assignment.getDeadline();
        String note = assignment.getNote() == null ? "" : MailService.box("Chỉ dẫn của toà soạn: " + MailService.escape(assignment.getNote()));
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Bạn được giao nhiệm vụ xác minh hiện trường:</p>
                  %s
                  <p>Hạn hoàn thành: <b>%s</b></p>
                  %s
                """.formatted(MailService.escape(contributor.getFullName()),
                MailService.box("<b>" + MailService.escape(submission.getTitle()) + "</b><br>"
                        + MailService.escape(submission.getAddress()) + ", " + MailService.escape(submission.getProvince())),
                deadline.format(DEADLINE_FORMAT), note));
        mailService.trySend(contributor.getEmail(), "[Tin Nóng Dân Sinh] Nhiệm vụ xác minh mới", html);
    }

    /** Email báo CTV nhiệm vụ đã bị thu hồi. */
    private void notifyCancelled(FieldAssignment assignment) {
        User contributor = assignment.getContributor();
        String html = MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Toà soạn đã thu hồi nhiệm vụ xác minh: <b>%s</b>.</p>
                  %s
                """.formatted(MailService.escape(contributor.getFullName()), MailService.escape(assignment.getSubmission().getTitle()),
                MailService.box("Lý do: " + MailService.escape(assignment.getCancelReason()))));
        mailService.trySend(contributor.getEmail(), "[Tin Nóng Dân Sinh] Nhiệm vụ xác minh đã bị thu hồi", html);
    }
}
