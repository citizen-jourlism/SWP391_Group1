
package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.FieldReportFeedback;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.springframework.stereotype.Repository;

/**
 * Đọc dữ liệu nghiệp vụ đã có để tổng hợp thông báo.
 * Không tạo bảng mới và không thay đổi cấu trúc Database.
 */
@Repository
public class NotificationReadRepository {

    @PersistenceContext
    private EntityManager entityManager;

    // =========================================================
    // 1. THÔNG BÁO HỒ SƠ TIN BÁO
    // =========================================================

    /**
     * Lấy lịch sử xử lý hồ sơ của người gửi.
     * Không lấy sự kiện do chính người gửi thực hiện.
     */
    public List<SubmissionEvent> submissionEvents(String userId) {
        return entityManager.createQuery("""
            SELECT e FROM SubmissionEvent e
            JOIN FETCH e.submission s
            WHERE s.author.id = :userId
              AND e.actor <> :reporter
            ORDER BY e.createdAt DESC, e.id DESC
            """, SubmissionEvent.class)
            .setParameter("userId", userId)
            .setParameter(
                "reporter",
                SubmissionEvent.Actor.REPORTER
            )
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 2. THÔNG BÁO ĐƠN ĐĂNG KÝ CỘNG TÁC VIÊN
    // =========================================================

    /**
     * Lấy đơn đăng ký CTV của chính tài khoản đang đăng nhập.
     */
    public List<ContributorApplication> applications(String userId) {
        return entityManager.createQuery("""
            SELECT a FROM ContributorApplication a
            WHERE a.applicant.id = :userId
            ORDER BY a.createdAt DESC, a.id DESC
            """, ContributorApplication.class)
            .setParameter("userId", userId)
            .setMaxResults(50)
            .getResultList();
    }

    // =========================================================
    // 3. LẤY VAI TRÒ TÀI KHOẢN
    // =========================================================

    /**
     * Lấy vai trò để xác định nhóm thông báo cần tổng hợp.
     */
    public User.Role roleOf(String userId) {
        return entityManager.createQuery("""
            SELECT u.role FROM User u
            WHERE u.id = :userId
            """, User.Role.class)
            .setParameter("userId", userId)
            .getSingleResult();
    }

    // =========================================================
    // 4. THÔNG BÁO DÀNH CHO CỘNG TÁC VIÊN
    // =========================================================

    /**
     * Lấy các nhiệm vụ được giao cho CTV.
     */
    public List<FieldAssignment> contributorAssignments(String userId) {
        return entityManager.createQuery("""
            SELECT a FROM FieldAssignment a
            JOIN FETCH a.submission
            WHERE a.contributor.id = :userId
            ORDER BY a.createdAt DESC, a.id DESC
            """, FieldAssignment.class)
            .setParameter("userId", userId)
            .setMaxResults(100)
            .getResultList();
    }

    /**
     * Lấy yêu cầu sửa bài, bổ sung tư liệu và kết quả duyệt
     * mà Biên tập viên gửi cho CTV.
     */
    public List<FieldReportFeedback> contributorFeedbacks(String userId) {
        return entityManager.createQuery("""
            SELECT f FROM FieldReportFeedback f
            JOIN FETCH f.report r
            JOIN FETCH r.assignment a
            JOIN FETCH a.submission
            JOIN FETCH f.editor
            WHERE a.contributor.id = :userId
            ORDER BY f.createdAt DESC, f.id DESC
            """, FieldReportFeedback.class)
            .setParameter("userId", userId)
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 5. THÔNG BÁO DÀNH CHO BIÊN TẬP VIÊN - NHIỆM VỤ CTV
    // =========================================================

    /**
     * Lấy báo cáo hiện trường thuộc các nhiệm vụ
     * do Biên tập viên này giao.
     */
    public List<FieldReport> reportsForEditor(String editorId) {
        return entityManager.createQuery("""
            SELECT r FROM FieldReport r
            JOIN FETCH r.assignment a
            JOIN FETCH a.submission
            JOIN FETCH a.contributor
            WHERE a.createdBy.id = :editorId
            ORDER BY r.createdAt DESC, r.id DESC
            """, FieldReport.class)
            .setParameter("editorId", editorId)
            .setMaxResults(100)
            .getResultList();
    }

    /**
     * Lấy phản hồi đã hoàn thành của CTV
     * đối với yêu cầu do Biên tập viên gửi.
     */
    public List<FieldReportFeedback> feedbackResponsesForEditor(
            String editorId
    ) {
        return entityManager.createQuery("""
            SELECT f FROM FieldReportFeedback f
            JOIN FETCH f.report r
            JOIN FETCH r.assignment a
            JOIN FETCH a.submission
            JOIN FETCH a.contributor
            WHERE f.editor.id = :editorId
              AND f.resolvedAt IS NOT NULL
            ORDER BY f.resolvedAt DESC, f.id DESC
            """, FieldReportFeedback.class)
            .setParameter("editorId", editorId)
            .setMaxResults(100)
            .getResultList();
    }

    /**
     * Lấy nhiệm vụ CTV từ chối hoặc tự hủy,
     * thuộc các nhiệm vụ do Biên tập viên này giao.
     */
    public List<FieldAssignment> cancelledAssignmentsForEditor(
            String editorId
    ) {
        return entityManager.createQuery("""
            SELECT a FROM FieldAssignment a
            JOIN FETCH a.submission
            JOIN FETCH a.contributor
            WHERE a.createdBy.id = :editorId
              AND a.status = :cancelled
              AND a.cancelType IN (:declined, :contributorCancelled)
            ORDER BY a.updatedAt DESC, a.id DESC
            """, FieldAssignment.class)
            .setParameter(
                "editorId",
                editorId
            )
            .setParameter(
                "cancelled",
                FieldAssignment.AssignmentStatus.CANCELLED
            )
            .setParameter(
                "declined",
                FieldAssignment.CancelType.DECLINED
            )
            .setParameter(
                "contributorCancelled",
                FieldAssignment.CancelType.CONTRIBUTOR_CANCELLED
            )
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 6. THÔNG BÁO DÀNH CHO CHUYÊN GIA
    // =========================================================

    /**
     * Lấy bài nghiên cứu đã nộp của Chuyên gia.
     * Không lấy bản nháp.
     */
    public List<ResearchArticle> researchArticlesByAuthor(
            String expertId
    ) {
        return entityManager.createQuery("""
            SELECT a FROM ResearchArticle a
            JOIN FETCH a.author
            WHERE a.author.id = :expertId
              AND a.status <> :draft
              AND a.submittedAt IS NOT NULL
            ORDER BY a.submittedAt DESC, a.id DESC
            """, ResearchArticle.class)
            .setParameter("expertId", expertId)
            .setParameter(
                "draft",
                ResearchArticle.Status.DRAFT
            )
            .setMaxResults(100)
            .getResultList();
    }

    /**
     * Lấy lịch sử biên tập bài nghiên cứu của Chuyên gia.
     */
    public List<EditoralReview> researchReviewsForAuthor(
            String expertId
    ) {
        return entityManager.createQuery("""
            SELECT r FROM EditoralReview r
            JOIN FETCH r.researchArticle a
            JOIN FETCH r.reviewer
            WHERE a.author.id = :expertId
            ORDER BY r.createdAt DESC, r.id DESC
            """, EditoralReview.class)
            .setParameter("expertId", expertId)
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 7. HÀNG ĐỢI BÀI NGHIÊN CỨU DÀNH CHO BIÊN TẬP VIÊN
    // =========================================================

    /**
     * Lấy bài nghiên cứu đang chờ Biên tập viên xử lý.
     * Không hiển thị bài đang chờ Chuyên gia phản hồi yêu cầu sửa.
     */
    public List<ResearchArticle> researchQueueForEditor() {
        return entityManager.createQuery("""
            SELECT a FROM ResearchArticle a
            JOIN FETCH a.author
            WHERE a.status = :submitted
              AND a.reviewStatus IS NULL
              AND NOT EXISTS (
                  SELECT r.id FROM EditoralReview r
                  WHERE r.researchArticle = a
                    AND r.reviewRole = :editorRole
                    AND r.action = :requestEdit
                    AND r.status = :pending
              )
            ORDER BY a.updatedAt DESC, a.id DESC
            """, ResearchArticle.class)
            .setParameter(
                "submitted",
                ResearchArticle.Status.SUBMITTED
            )
            .setParameter(
                "editorRole",
                EditoralReview.ReviewRole.EDITOR
            )
            .setParameter(
                "requestEdit",
                EditoralReview.ReviewAction.REQUEST_EDIT
            )
            .setParameter(
                "pending",
                EditoralReview.RequestStatus.PENDING
            )
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 8. HÀNG ĐỢI BÀI NGHIÊN CỨU DÀNH CHO PHÓ TỔNG BIÊN TẬP
    // =========================================================

    /**
     * Lấy bài đang chờ Phó Tổng biên tập.
     * Chỉ lấy bài thuộc lĩnh vực có chuyên mục do tài khoản này phụ trách.
     */
    public List<ResearchArticle> researchQueueForDeputy(
            String deputyId
    ) {
        return entityManager.createQuery("""
            SELECT a FROM ResearchArticle a
            JOIN FETCH a.author
            WHERE a.status = :submitted
              AND a.reviewStatus = :waiting
              AND EXISTS (
                  SELECT c.id FROM Category c
                  WHERE c.name = a.field
                    AND c.deputyEic.id = :deputyId
              )
            ORDER BY a.updatedAt DESC, a.id DESC
            """, ResearchArticle.class)
            .setParameter(
                "submitted",
                ResearchArticle.Status.SUBMITTED
            )
            .setParameter(
                "waiting",
                ResearchArticle.ReviewStatus.DEPUTY_PENDING
            )
            .setParameter(
                "deputyId",
                deputyId
            )
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 9. HÀNG ĐỢI BÀI NGHIÊN CỨU DÀNH CHO TỔNG BIÊN TẬP
    // =========================================================

    /**
     * Tổng biên tập chỉ nhận bài BREAKING được chuyển lên
     * sau bước duyệt của Phó Tổng biên tập.
     */
    public List<ResearchArticle> researchQueueForEic() {
        return entityManager.createQuery("""
            SELECT a FROM ResearchArticle a
            JOIN FETCH a.author
            WHERE a.status = :submitted
              AND a.reviewStatus = :waiting
              AND a.priority = :breaking
            ORDER BY a.updatedAt DESC, a.id DESC
            """, ResearchArticle.class)
            .setParameter(
                "submitted",
                ResearchArticle.Status.SUBMITTED
            )
            .setParameter(
                "waiting",
                ResearchArticle.ReviewStatus.EIC_PENDING
            )
            .setParameter(
                "breaking",
                ResearchArticle.Priority.BREAKING
            )
            .setMaxResults(100)
            .getResultList();
    }

    /**
     * Hàm tổng hợp hàng đợi theo vai trò tài khoản.
     */
    public List<ResearchArticle> researchQueue(
            String userId,
            User.Role role
    ) {
        return switch (role) {
            case EDITOR -> researchQueueForEditor();
            case DEPUTY_EIC -> researchQueueForDeputy(userId);
            case EIC -> researchQueueForEic();
            default -> List.of();
        };
    }

    // =========================================================
    // 10. CHUYÊN GIA ĐÃ PHẢN HỒI YÊU CẦU CHỈNH SỬA
    // =========================================================

    /**
     * Lấy các yêu cầu chỉnh sửa bài nghiên cứu đã được Chuyên gia
     * đồng ý hoặc từ chối, gửi bởi đúng Biên tập viên này.
     */
    public List<EditoralReview> researchRevisionResponsesForEditor(
            String editorId
    ) {
        return entityManager.createQuery("""
            SELECT r FROM EditoralReview r
            JOIN FETCH r.researchArticle a
            JOIN FETCH a.author
            WHERE r.reviewer.id = :editorId
              AND r.reviewRole = :editorRole
              AND r.action = :requestEdit
              AND r.status IN (:accepted, :rejected)
            ORDER BY r.updatedAt DESC, r.id DESC
            """, EditoralReview.class)
            .setParameter(
                "editorId",
                editorId
            )
            .setParameter(
                "editorRole",
                EditoralReview.ReviewRole.EDITOR
            )
            .setParameter(
                "requestEdit",
                EditoralReview.ReviewAction.REQUEST_EDIT
            )
            .setParameter(
                "accepted",
                EditoralReview.RequestStatus.ACCEPTED
            )
            .setParameter(
                "rejected",
                EditoralReview.RequestStatus.REJECTED
            )
            .setMaxResults(100)
            .getResultList();
    }

    // =========================================================
    // 11. PHẢN HỒI CỦA BAN BIÊN TẬP DÀNH CHO BIÊN TẬP VIÊN
    // =========================================================

    /**
     * Lấy yêu cầu chỉnh sửa hoặc từ chối của Phó Tổng biên tập
     * và Tổng biên tập sau lần duyệt gần nhất của Biên tập viên.
     *
     * Chỉ trả về cho Biên tập viên đã thực hiện lần duyệt gần nhất,
     * tránh gửi nhầm thông báo cho Biên tập viên khác.
     */
    public List<EditoralReview> leadershipResearchFeedbackForEditor(
            String editorId
    ) {
        return entityManager.createQuery("""
            SELECT r FROM EditoralReview r
            JOIN FETCH r.researchArticle a
            WHERE r.reviewRole IN (:deputyRole, :eicRole)
              AND r.action IN (:requestEdit, :reject)
              AND EXISTS (
                  SELECT approval.id FROM EditoralReview approval
                  WHERE approval.researchArticle = a
                    AND approval.reviewRole = :editorRole
                    AND approval.action = :approve
                    AND approval.reviewer.id = :editorId
                    AND approval.id = (
                        SELECT MAX(latest.id)
                        FROM EditoralReview latest
                        WHERE latest.researchArticle = a
                          AND latest.reviewRole = :editorRole
                          AND latest.action = :approve
                    )
                    AND r.createdAt >= approval.createdAt
              )
            ORDER BY r.createdAt DESC, r.id DESC
            """, EditoralReview.class)
            .setParameter(
                "deputyRole",
                EditoralReview.ReviewRole.DEPUTY_EIC
            )
            .setParameter(
                "eicRole",
                EditoralReview.ReviewRole.EIC
            )
            .setParameter(
                "requestEdit",
                EditoralReview.ReviewAction.REQUEST_EDIT
            )
            .setParameter(
                "reject",
                EditoralReview.ReviewAction.REJECT
            )
            .setParameter(
                "editorRole",
                EditoralReview.ReviewRole.EDITOR
            )
            .setParameter(
                "approve",
                EditoralReview.ReviewAction.APPROVE
            )
            .setParameter(
                "editorId",
                editorId
            )
            .setMaxResults(100)
            .getResultList();
    }
}
