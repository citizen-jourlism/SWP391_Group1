
package com.example.citizen_journalism.service;

import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.UserRepository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * TungTT - Iteration 3 - Task 4 & Task 5.
 *
 * Task 4: Newsroom Performance & Editorial Workflow Dashboard.
 * Task 5: Editorial Staff Directory & Roster.
 *
 * Chỉ đọc dữ liệu có sẵn từ Database.
 * Không thêm bảng, không sửa Entity hay Repository.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeputyNewsroomInsightsService {

    private final UserRepository users;
    private final EntityManager em;

    // ==========================================
    // 1. DTO VÀ ENUM
    // ==========================================

    public enum Period {
        DAY,
        WEEK,
        MONTH
    }

    // Thống kê hiệu suất tòa soạn.
    public record Dashboard(
            String period,
            LocalDate from,
            LocalDate to,
            long submissions,
            long researchArticles,
            long totalContent,
            long approvedDecisions,
            long rejectedDecisions
    ) {}

    // Thông tin một nhân sự biên tập.
    public record StaffItem(
            String id,
            String fullName,
            String email,
            String phone,
            String role,
            String status,
            Long assignedSubmissions,
            long reviewDecisions
    ) {}

    // Danh sách và thống kê nhân sự.
    public record StaffDirectory(
            int totalStaff,
            long editors,
            long deputyEditors,
            long editorsInChief,
            List<StaffItem> items
    ) {}

    // Hồ sơ/bài được phân công cho một Editor.
    public record StaffSubmission(
            Long id,
            String title,
            String status,
            LocalDateTime createdAt
    ) {}

    // ==========================================
    // 2. KIỂM TRA QUYỀN
    // ==========================================

    /**
     * Chỉ Phó Tổng Biên tập và Tổng Biên tập
     * được truy cập Dashboard và danh bạ.
     */
    private void requireLeadership(String userId) {

        User user = users.getActiveById(userId);

        if (user.getRole() != User.Role.DEPUTY_EIC
                && user.getRole() != User.Role.EIC) {

            throw AppException.forbidden(
                    "Chỉ Ban biên tập được xem dữ liệu này.",
                    "LEADERSHIP_REQUIRED"
            );
        }
    }

    // ==========================================
    // TASK 4 - DASHBOARD HIỆU SUẤT
    // ==========================================

    /**
     * Lấy thống kê theo:
     * DAY   - Hôm nay
     * WEEK  - Tuần hiện tại
     * MONTH - Tháng hiện tại
     *
     * Approved/Rejected được tính theo số lượt
     * quyết định, không phải số bài duy nhất.
     */
    public Dashboard dashboard(
            String userId,
            Period period
    ) {
        requireLeadership(userId);

        LocalDate today = LocalDate.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );

        // Ngày bắt đầu thống kê.
        LocalDate from = switch (period) {

            case DAY -> today;

            case WEEK -> today.with(
                    TemporalAdjusters.previousOrSame(
                            DayOfWeek.MONDAY
                    )
            );

            case MONTH -> today.withDayOfMonth(1);
        };

        // Mốc kết thúc không bao gồm ngày này.
        LocalDate toExclusive = switch (period) {

            case DAY -> from.plusDays(1);

            case WEEK -> from.plusWeeks(1);

            case MONTH -> from.plusMonths(1);
        };

        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = toExclusive.atStartOfDay();

        // --------------------------------------
        // Đếm hồ sơ/tin tiếp nhận.
        // --------------------------------------
        long submissions = em.createQuery("""
                select count(s)
                from Submission s
                where s.createdAt >= :start
                  and s.createdAt < :end
                  and s.type <> :excluded
                """, Long.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter(
                        "excluded",
                        Submission.SubmissionType.CONTRIBUTOR_POST
                )
                .getSingleResult();

        // --------------------------------------
        // Đếm bài nghiên cứu đã nộp trong kỳ, dù sau đó
        // đã được duyệt, trả về hay từ chối (bản nháp
        // chưa nộp có submittedAt = null nên không bị đếm).
        // --------------------------------------
        long research = em.createQuery("""
                select count(r)
                from ResearchArticle r
                where r.submittedAt >= :start
                  and r.submittedAt < :end
                """, Long.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();

        // --------------------------------------
        // Đếm lượt APPROVE.
        // --------------------------------------
        long approved = countDecisions(
                EditoralReview.ReviewAction.APPROVE,
                start,
                end
        );

        // --------------------------------------
        // Đếm lượt REJECT.
        // --------------------------------------
        long rejected = countDecisions(
                EditoralReview.ReviewAction.REJECT,
                start,
                end
        );

        return new Dashboard(
                period.name(),
                from,
                toExclusive.minusDays(1),
                submissions,
                research,
                submissions + research,
                approved,
                rejected
        );
    }

    /**
     * Đếm số quyết định APPROVE hoặc REJECT
     * được tạo trong khoảng thời gian đã chọn.
     */
    private long countDecisions(
            EditoralReview.ReviewAction action,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return em.createQuery("""
                select count(r)
                from EditoralReview r
                where r.action = :action
                  and r.createdAt >= :start
                  and r.createdAt < :end
                """, Long.class)
                .setParameter("action", action)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();
    }

    // ==========================================
    // TASK 5 - DANH BẠ NHÂN SỰ
    // ==========================================

    /**
     * Tìm nhân sự theo tên, email hoặc mã.
     *
     * Bao gồm:
     * - EDITOR
     * - DEPUTY_EIC
     * - EIC
     */
    public StaffDirectory directory(
            String userId,
            String keyword
    ) {
        requireLeadership(userId);

        String q = keyword == null
                ? ""
                : keyword.trim().toLowerCase();

        if (q.length() > 100) {
            throw AppException.badRequest(
                    "Từ khóa tối đa 100 ký tự."
            );
        }

        // --------------------------------------
        // Lấy nhân sự tòa soạn.
        // --------------------------------------
        List<User> staff = em.createQuery("""
                select u
                from User u
                where u.role in :roles
                  and (
                    :keyword = ''
                    or lower(u.fullName) like :pattern
                    or lower(u.email) like :pattern
                    or lower(u.id) like :pattern
                  )
                order by u.fullName asc, u.id asc
                """, User.class)
                .setParameter(
                        "roles",
                        Set.of(
                                User.Role.EDITOR,
                                User.Role.DEPUTY_EIC,
                                User.Role.EIC
                        )
                )
                .setParameter("keyword", q)
                .setParameter("pattern", "%" + q + "%")
                .getResultList();

        Map<String, Long> assigned = new HashMap<>();
        Map<String, Long> reviewed = new HashMap<>();

        if (!staff.isEmpty()) {

            List<String> ids = staff.stream()
                    .map(User::getId)
                    .toList();

            // ----------------------------------
            // Số hồ sơ hiện được gắn cho Editor.
            // ----------------------------------
            List<Object[]> assignmentRows =
                    em.createQuery("""
                            select s.assignedEditor.id, count(s)
                            from Submission s
                            where s.assignedEditor.id in :ids
                              and s.type <> :excluded
                            group by s.assignedEditor.id
                            """, Object[].class)
                    .setParameter("ids", ids)
                    .setParameter(
                            "excluded",
                            Submission.SubmissionType.CONTRIBUTOR_POST
                    )
                    .getResultList();

            for (Object[] row : assignmentRows) {
                assigned.put(
                        (String) row[0],
                        (Long) row[1]
                );
            }

            // ----------------------------------
            // Số bản ghi nhận xét/quyết định
            // trong editorial_reviews.
            // ----------------------------------
            List<Object[]> reviewRows =
                    em.createQuery("""
                            select r.reviewer.id, count(r)
                            from EditoralReview r
                            where r.reviewer.id in :ids
                            group by r.reviewer.id
                            """, Object[].class)
                    .setParameter("ids", ids)
                    .getResultList();

            for (Object[] row : reviewRows) {
                reviewed.put(
                        (String) row[0],
                        (Long) row[1]
                );
            }
        }

        // --------------------------------------
        // Chuyển Entity thành DTO an toàn.
        // --------------------------------------
        List<StaffItem> items = staff.stream()
                .map(user -> new StaffItem(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole().name(),
                        user.getStatus().name(),

                        // Chỉ Editor có hồ sơ được giao.
                        user.getRole() == User.Role.EDITOR
                                ? assigned.getOrDefault(
                                        user.getId(),
                                        0L
                                )
                                : null,

                        reviewed.getOrDefault(
                                user.getId(),
                                0L
                        )
                ))
                .toList();

        // --------------------------------------
        // Thống kê số nhân sự theo vai trò.
        // --------------------------------------
        long editors = items.stream()
                .filter(item ->
                        item.role().equals("EDITOR")
                )
                .count();

        long deputyEditors = items.stream()
                .filter(item ->
                        item.role().equals("DEPUTY_EIC")
                )
                .count();

        long editorsInChief = items.stream()
                .filter(item ->
                        item.role().equals("EIC")
                )
                .count();

        return new StaffDirectory(
                items.size(),
                editors,
                deputyEditors,
                editorsInChief,
                items
        );
    }

    // ==========================================
    // TASK 5 - DANH SÁCH HỒ SƠ CỦA EDITOR
    // ==========================================

    /**
     * Lấy tối đa 50 hồ sơ mới nhất hiện
     * được phân công cho một Editor.
     *
     * Đây là danh sách hồ sơ đang gắn với
     * Editor, không phải toàn bộ lịch sử
     * bài viết từng được Editor xử lý.
     *
     * Không thay đổi trạng thái hồ sơ.
     */
    public List<StaffSubmission> staffSubmissions(
            String requesterId,
            String editorId
    ) {
        requireLeadership(requesterId);

        // Kiểm tra nhân sự được chọn là Editor.
        User editor = users.findById(editorId)
                .filter(user ->
                        user.getRole() == User.Role.EDITOR
                )
                .orElseThrow(() ->
                        AppException.notFound(
                                "Không tìm thấy Biên tập viên."
                        )
                );

        // Lấy hồ sơ hiện gắn với Editor này.
        List<Submission> submissions = em.createQuery("""
                select s
                from Submission s
                where s.assignedEditor.id = :editorId
                  and s.type <> :excluded
                order by s.createdAt desc, s.id desc
                """, Submission.class)
                .setParameter(
                        "editorId",
                        editor.getId()
                )
                .setParameter(
                        "excluded",
                        Submission.SubmissionType.CONTRIBUTOR_POST
                )
                .setMaxResults(50)
                .getResultList();

        // Chỉ trả những trường cần hiển thị.
        return submissions.stream()
                .map(submission -> new StaffSubmission(
                        submission.getId(),
                        submission.getTitle(),
                        submission.getStatus() == null
                                ? "UNKNOWN"
                                : submission.getStatus().name(),
                        submission.getCreatedAt()
                ))
                .toList();
    }
}
