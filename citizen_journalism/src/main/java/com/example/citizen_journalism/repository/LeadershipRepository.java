package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn cho BÀN DUYỆT của Ban biên tập (Phó TBT / Tổng biên tập) — LeadershipService.
 * Luồng: LeadershipQueue.jsx -> leadershipService.js -> LeadershipController -> LeadershipService -> repository này.
 *
 * Kiểu chính là EditoralReview (mỗi thao tác của Ban biên tập = 1 dòng editorial_reviews), các câu @Query viết tay
 * đọc thêm bảng submissions / research_articles để không phải sửa repository của chức năng khác.
 */
public interface LeadershipRepository extends JpaRepository<EditoralReview, Long> {

    /**
     * Hồ sơ phản ánh đang ở 1 trạng thái (DEPUTY_PENDING / EIC_PENDING), lọc theo loại và từ khoá (mã hoặc tiêu đề).
     * Bài CTV nộp (CONTRIBUTOR_POST) đi kèm hồ sơ gốc nên không đưa vào danh sách.
     * deputyId != null (Phó TBT xem): chỉ hồ sơ thuộc chuyên mục người này phụ trách, cộng hồ sơ chưa có ai phụ trách
     * (chuyển lên trước khi bắt buộc phân loại, hoặc chuyên mục bị gỡ người phụ trách) để không hồ sơ nào bị kẹt.
     * Dùng LEFT JOIN vì viết s.category.deputyEic sẽ thành INNER JOIN và bỏ mất hồ sơ chưa phân loại.
     */
    @Query("select s from Submission s left join s.category c left join c.deputyEic d "
            + "where s.type <> com.example.citizen_journalism.entity.Submission.SubmissionType.CONTRIBUTOR_POST "
            + "and (:deputyId is null or d is null or d.id = :deputyId) "
            + "and s.status = :status "
            + "and (:category is null or s.reportCategory = :category) "
            + "and (:keyword is null or lower(s.trackingCode) like lower(concat('%', :keyword, '%')) "
            + "     or lower(s.title) like lower(concat('%', :keyword, '%')))")
    Page<Submission> searchSubmissions(@Param("status") Submission.SubmissionStatus status,
                                       @Param("category") Submission.ReportCategory category,
                                       @Param("keyword") String keyword,
                                       @Param("deputyId") String deputyId,
                                       Pageable pageable);

    /** Bài nghiên cứu đã nộp có kết quả duyệt = reviewStatus, lọc theo tiêu đề. */
    @Query("select a from ResearchArticle a where a.status = "
            + "com.example.citizen_journalism.entity.ResearchArticle.Status.SUBMITTED "
            + "and a.reviewStatus = :reviewStatus "
            + "and (:keyword is null or lower(a.title) like lower(concat('%', :keyword, '%'))) "
            // deputyId != null (Phó TBT xem): chỉ bài có lĩnh vực trùng tên 1 chuyên mục người này phụ trách
            + "and (:deputyId is null or exists (select c.id from Category c "
            + "     where c.name = a.field and c.deputyEic.id = :deputyId))")
    Page<ResearchArticle> searchResearch(@Param("reviewStatus") ResearchArticle.ReviewStatus reviewStatus,
                                         @Param("keyword") String keyword,
                                         @Param("deputyId") String deputyId,
                                         Pageable pageable);

    /** Phó TBT này có phụ trách chuyên mục tên = lĩnh vực của bài không (categories.deputy_eic_id). */
    @Query("select count(c) > 0 from Category c where c.name = :field and c.deputyEic.id = :deputyId")
    boolean isDeputyOfField(@Param("field") String field, @Param("deputyId") String deputyId);

    /** Mọi thao tác của toà soạn trên 1 hồ sơ, cũ trước. */
    List<EditoralReview> findBySubmissionIdOrderByIdAsc(Long submissionId);

    /** Mọi thao tác của toà soạn trên 1 bài nghiên cứu, cũ trước. */
    List<EditoralReview> findByResearchArticleIdOrderByIdAsc(Long articleId);
}
