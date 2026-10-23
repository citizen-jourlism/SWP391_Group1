package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** REPOSITORY cho bảng "submission_events" (nhật ký xử lý hồ sơ). */
public interface SubmissionEventRepository extends JpaRepository<SubmissionEvent, Long> {

    /** Nhật ký của 1 hồ sơ theo thứ tự thời gian (bước 1, 2, 3...). Id tăng dần để 2 bước cùng thời điểm vẫn đúng thứ tự. */
    List<SubmissionEvent> findBySubmissionOrderByCreatedAtAscIdAsc(Submission submission);
}
