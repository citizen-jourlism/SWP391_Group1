package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY cho bảng "submissions" (tin nóng, khiếu nại, bài viết...).
 * Hiện mới dùng để ĐẾM cho Dashboard admin; chức năng gửi tin/khiếu nại sẽ bổ sung thêm hàm sau.
 */
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    long countByStatus(Submission.SubmissionStatus status);
}
