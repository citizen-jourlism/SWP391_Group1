package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.FieldReport;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** REPOSITORY cho bảng "field_reports" (báo cáo hiện trường). Dùng ở FieldReportService. */
public interface FieldReportRepository extends JpaRepository<FieldReport, Long> {

    Optional<FieldReport> findByAssignmentId(Long assignmentId);

    /** Báo cáo của nhiều nhiệm vụ trong 1 câu SQL, cho các danh sách. */
    List<FieldReport> findByAssignmentIdIn(Collection<Long> assignmentIds);

    /** Các báo cáo của 1 Cộng tác viên, có phân trang, kèm hồ sơ gốc và bài viết để không phải chạy thêm SQL cho từng dòng. */
    @EntityGraph(attributePaths = {"assignment.submission", "assignment.outputSubmission"})
    Page<FieldReport> findByAssignmentContributorId(String contributorId, Pageable pageable);

    long countByAssignmentContributorId(String contributorId);

    /** Số báo cáo nộp đúng hạn của 1 Cộng tác viên. */
    @Query("select count(r) from FieldReport r where r.assignment.contributor.id = :contributorId and r.createdAt <= r.assignment.deadline")
    long countOnTimeByContributor(@Param("contributorId") String contributorId);
}
