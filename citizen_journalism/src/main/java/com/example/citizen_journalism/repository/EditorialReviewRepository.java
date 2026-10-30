package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.Submission;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** REPOSITORY cho bảng "editorial_reviews" (kết quả xét duyệt của BTV / Phó TBT / TBT, kèm ghi chú nội bộ). */
public interface EditorialReviewRepository extends JpaRepository<EditoralReview, Long> {

    /** Lần xét duyệt gần nhất có hành động này, ví dụ lần từ chối gần nhất của hồ sơ (action = REJECT). */
    Optional<EditoralReview> findFirstBySubmissionAndActionOrderByCreatedAtDescIdDesc(Submission submission,
                                                                                   EditoralReview.ReviewAction action);
}
