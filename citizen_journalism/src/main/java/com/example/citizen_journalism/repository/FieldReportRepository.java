package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.FieldReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** REPOSITORY cho bảng "field_reports" (báo cáo hiện trường). Dùng ở FieldReportService. */
public interface FieldReportRepository extends JpaRepository<FieldReport, Long> {

    Optional<FieldReport> findByAssignmentId(Long assignmentId);
}
