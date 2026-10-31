package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

/**
 * REPOSITORY cho bảng "submissions" (tin nóng, khiếu nại, bài viết...).
 * Dùng ở: AdminService (đếm), SubmissionService (gửi mới), SubmissionTrackingService (tra cứu, "Thông tin đã gửi").
 * Spring tự viết câu SQL dựa vào TÊN hàm (ví dụ findByTrackingCode -> WHERE tracking_code = ?).
 */
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    long countByStatus(Submission.SubmissionStatus status);

    /** Tra cứu theo mã hồ sơ, ví dụ "KB-2026-0001". */
    Optional<Submission> findByTrackingCode(String trackingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = "author")
    @Query("select s from Submission s where s.trackingCode = :trackingCode")
    Optional<Submission> findForReviewByTrackingCode(@Param("trackingCode") String trackingCode);

    /** Hồ sơ theo mã, CHỈ khi đúng người gửi (để người khác không xem được hồ sơ của mình bằng cách đổi mã trên URL). */
    Optional<Submission> findByTrackingCodeAndAuthorId(String trackingCode, String authorId);

    /** Các hồ sơ của 1 người gửi, có phân trang (thứ tự sắp xếp truyền qua Pageable). */
    @EntityGraph(attributePaths = "author")
    Page<Submission> findByAuthorId(String authorId, Pageable pageable);

    /**
     * Các hồ sơ của 1 người gửi, có phân trang (thứ tự sắp xếp truyền qua Pageable).
     * type: loại cần bỏ qua. Bài CTV nộp kèm báo cáo (CONTRIBUTOR_POST) không phải hồ sơ họ gửi tới toà soạn.
     */
    @EntityGraph(attributePaths = "author")
    Page<Submission> findByAuthorIdAndTypeNot(String authorId, Submission.SubmissionType type, Pageable pageable);

    long countByAuthorId(String authorId);

    /** Số hồ sơ KHÁC (id khác) của 1 người đang ở trạng thái này, ví dụ đã bị từ chối bao nhiêu lần (màn Từ chối hồ sơ). */
    long countByAuthorIdAndStatusAndIdNot(String authorId, Submission.SubmissionStatus status, Long id);

    long countByTypeAndStatus(Submission.SubmissionType type, Submission.SubmissionStatus status);

    @EntityGraph(attributePaths = "author")
    Page<Submission> findByStatusAndAuthorRole(Submission.SubmissionStatus status, User.Role role, Pageable pageable);

    /** Đếm bỏ qua 1 loại, dùng để không tính bài CTV nộp (CONTRIBUTOR_POST) vào số hồ sơ. */
    long countByTypeNotAndStatus(Submission.SubmissionType type, Submission.SubmissionStatus status);

    long countByTypeNot(Submission.SubmissionType type);

    /**
     * Hàng đợi của toà soạn (EditorService): lọc theo trạng thái / loại phản ánh, tham số null = không lọc.
     * ":status is null or ..." là cách viết điều kiện "không bắt buộc" trong JPQL.
     * Bài CTV nộp (CONTRIBUTOR_POST) xem ở nhiệm vụ của hồ sơ gốc, không vào hàng đợi.
     */
    @Query("select s from Submission s where s.type <> com.example.citizen_journalism.entity.Submission.SubmissionType.CONTRIBUTOR_POST "
            + "and (:status is null or s.status = :status) "
            + "and (:category is null or s.reportCategory = :category)")
    Page<Submission> searchForStaff(@Param("status") Submission.SubmissionStatus status,
                                    @Param("category") Submission.ReportCategory category,
                                    Pageable pageable);

    /**
     * Cập nhật bộ đếm nhập sai PIN (xem SubmissionTrackingService.track).
     * TẠI SAO viết câu UPDATE riêng thay vì setPinFailedAttempts()? Câu UPDATE trực tiếp KHÔNG làm đổi
     * cột updated_at, nên "Cập nhật lần cuối" của hồ sơ vẫn đúng là lúc toà soạn xử lý, không bị nhảy
     * mỗi khi có người gõ sai PIN. @Modifying: báo cho Spring đây là câu lệnh thay đổi dữ liệu (không phải SELECT).
     */
    @Modifying
    @Query("update Submission s set s.pinFailedAttempts = :attempts, s.pinLockedUntil = :lockedUntil where s.id = :id")
    void updatePinGuard(@Param("id") Long id, @Param("attempts") int attempts,
                        @Param("lockedUntil") LocalDateTime lockedUntil);
}
