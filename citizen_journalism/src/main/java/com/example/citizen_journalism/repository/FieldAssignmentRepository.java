package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.FieldAssignment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * REPOSITORY cho bảng "field_assignments" (nhiệm vụ xác minh hiện trường giao cho Cộng tác viên).
 * Dùng ở FieldAssignmentService.
 *
 * @EntityGraph: lấy luôn hồ sơ + Cộng tác viên trong CÙNG câu SQL (JOIN), tránh hiện danh sách 10 nhiệm vụ
 * lại phải chạy thêm hàng chục câu SQL để lấy tên từng người.
 */
public interface FieldAssignmentRepository extends JpaRepository<FieldAssignment, Long> {

    /** Hồ sơ này còn nhiệm vụ nào đang hiệu lực không (mỗi hồ sơ chỉ giao 1 nhiệm vụ tại một thời điểm). */
    boolean existsBySubmissionIdAndStatusIn(Long submissionId, Collection<FieldAssignment.AssignmentStatus> statuses);

    /** Nhiệm vụ mới nhất của 1 hồ sơ theo mã hồ sơ, kèm CTV. */
    @EntityGraph(attributePaths = {"submission", "contributor"})
    Optional<FieldAssignment> findTopBySubmissionTrackingCodeOrderByCreatedAtDescIdDesc(String trackingCode);

    /** Danh sách nhiệm vụ cho Biên tập viên, lọc theo các trạng thái, có phân trang. */
    @EntityGraph(attributePaths = {"submission", "contributor"})
    Page<FieldAssignment> findByStatusIn(Collection<FieldAssignment.AssignmentStatus> statuses, Pageable pageable);

    /** Danh sách nhiệm vụ của 1 Cộng tác viên, lọc theo các trạng thái, có phân trang. */
    @EntityGraph(attributePaths = {"submission"})
    Page<FieldAssignment> findByContributorIdAndStatusIn(String contributorId, Collection<FieldAssignment.AssignmentStatus> statuses,
                                                         Pageable pageable);

    /** 1 nhiệm vụ, chỉ khi nó thuộc về đúng Cộng tác viên này. */
    @EntityGraph(attributePaths = {"submission", "contributor", "createdBy"})
    Optional<FieldAssignment> findByIdAndContributorId(Long id, String contributorId);

    /** Một dòng thống kê: mã CTV + trạng thái + số nhiệm vụ. */
    interface WorkloadRow {
        String getContributorId();

        FieldAssignment.AssignmentStatus getStatus();

        long getTotal();
    }

    /** Đếm nhiệm vụ theo từng CTV và trạng thái trong 1 câu SQL, để hiện "đang làm / đã xong" trên thẻ CTV. */
    @Query("""
            select a.contributor.id as contributorId, a.status as status, count(a) as total
            from FieldAssignment a
            where a.contributor.id in :contributorIds
            group by a.contributor.id, a.status
            """)
    List<WorkloadRow> countByContributors(@Param("contributorIds") Collection<String> contributorIds);
}
