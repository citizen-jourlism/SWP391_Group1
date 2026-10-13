package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Evidence;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY cho bảng "evidences" (tệp tư liệu, bằng chứng gắn với một tin/khiếu nại).
 * Hiện dùng ở SubmissionService khi lưu các tệp người dân tải lên kèm form.
 */
public interface EvidenceRepository extends JpaRepository<Evidence, Long> {
}
