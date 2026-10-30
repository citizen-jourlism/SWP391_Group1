package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ContributorApplication;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY cho bảng "contributor_applications" (đơn đăng ký Cộng tác viên).
 * Dùng ở ContributorApplicationService (người dân nộp / theo dõi đơn, Biên tập viên xét duyệt).
 *
 * @EntityGraph(attributePaths = "applicant"): lấy luôn người nộp đơn trong CÙNG câu SQL (JOIN),
 * tránh việc hiện danh sách 10 đơn lại phải chạy thêm 10 câu SQL để lấy tên từng người.
 */
public interface ContributorApplicationRepository extends JpaRepository<ContributorApplication, Long> {

    /** Mọi đơn của 1 người, mới nhất trước (đơn đầu tiên = đơn hiện tại, còn lại là lịch sử). */
    List<ContributorApplication> findByApplicantIdOrderByCreatedAtDescIdDesc(String applicantId);

    /** Người này có đơn nào đang ở các trạng thái này không (dùng để chặn nộp 2 đơn cùng lúc). */
    boolean existsByApplicantIdAndStatusIn(String applicantId, Collection<ContributorApplication.Status> statuses);

    long countByStatus(ContributorApplication.Status status);

    /** Danh sách cho Biên tập viên, lọc theo các trạng thái, có phân trang. */
    @EntityGraph(attributePaths = "applicant")
    Page<ContributorApplication> findByStatusIn(Collection<ContributorApplication.Status> statuses, Pageable pageable);

    @EntityGraph(attributePaths = "applicant")
    Optional<ContributorApplication> findWithApplicantById(Long id);
}
