package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Evidence;
import com.example.citizen_journalism.entity.Submission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY cho bảng "evidences" (tệp tư liệu, bằng chứng gắn với một tin/khiếu nại).
 * Dùng ở SubmissionService: lưu tệp khi gửi form, đọc lại khi xem chi tiết hồ sơ.
 */
public interface EvidenceRepository extends JpaRepository<Evidence, Long> {

    /** Các tệp của 1 hồ sơ theo thứ tự tải lên. */
    List<Evidence> findBySubmissionOrderByIdAsc(Submission submission);
}
