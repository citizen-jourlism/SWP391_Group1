package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.Submission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY cho bảng "field_assignments" (nhiệm vụ xác minh thực địa Biên tập viên giao cho Cộng tác viên).
 * Dùng ở SubmissionVerificationReviewService: tìm nhiệm vụ của hồ sơ và bài CTV nộp về (output_submission_id).
 */
public interface FieldAssignmentRepository extends JpaRepository<FieldAssignment, Long> {

    /** Các nhiệm vụ của 1 hồ sơ, mới nhất trước (1 hồ sơ có thể bị giao lại sau khi nhiệm vụ cũ bị huỷ). */
    List<FieldAssignment> findBySubmissionOrderByCreatedAtDescIdDesc(Submission submission);
}
