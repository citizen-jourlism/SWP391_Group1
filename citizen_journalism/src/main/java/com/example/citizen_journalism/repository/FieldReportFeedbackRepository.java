package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.FieldReportFeedback;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/** REPOSITORY cho bảng "field_report_feedbacks" (phản hồi của Biên tập viên). Dùng ở FieldReportService. */
public interface FieldReportFeedbackRepository extends JpaRepository<FieldReportFeedback, Long> {

    /** Mọi phản hồi của 1 báo cáo từ cũ đến mới, kèm tên Biên tập viên. */
    @EntityGraph(attributePaths = {"editor"})
    List<FieldReportFeedback> findByReportIdOrderByIdAsc(Long reportId);

    /** Phản hồi mới nhất của 1 báo cáo. */
    Optional<FieldReportFeedback> findTopByReportIdOrderByIdDesc(Long reportId);

    /** Phản hồi của nhiều nhiệm vụ trong 1 câu SQL, từ cũ đến mới, cho danh sách và lịch sử. */
    @EntityGraph(attributePaths = {"report", "editor"})
    List<FieldReportFeedback> findByReportAssignmentIdInOrderByIdAsc(Collection<Long> assignmentIds);
}
