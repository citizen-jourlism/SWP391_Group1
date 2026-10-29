package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * MỌI CÂU TRUY VẤN của luồng biên tập bài nghiên cứu (chỉ dùng ở ResearchEditorialService).
 *
 * Repository chính của bảng editorial_reviews (entity EditoralReview): mỗi thao tác của Biên tập viên trên 1 bài
 * nghiên cứu là 1 dòng — yêu cầu chỉnh sửa (REQUEST_EDIT), duyệt (APPROVE), từ chối (REJECT).
 * Các câu @Query viết tay đọc thêm bảng khác (submissions, research_articles, categories) để không phải sửa
 * repository dùng chung của nhóm.
 *
 * Tham số null = không lọc (cách viết ":x is null or ..." giống SubmissionRepository.searchForStaff).
 */
public interface ResearchEditorialRepository extends JpaRepository<EditoralReview, Long> {

    // ===================== editorial_reviews =====================

    /** Mọi thao tác của BTV trên 1 bài, mới nhất trước (service tự tách yêu cầu chỉnh sửa / kết quả duyệt). */
    List<EditoralReview> findByResearchArticleIdOrderByIdDesc(Long articleId);

    /** Mọi thao tác của BTV trên các bài của 1 Chuyên gia, mới nhất trước. */
    List<EditoralReview> findByResearchArticleAuthorIdOrderByIdDesc(String authorId);

    // ===================== HÀNG ĐỢI TIN BÀI =====================

    /**
     * Hồ sơ phản ánh theo trạng thái / loại / lĩnh vực (= tên chuyên mục toà soạn).
     * "left join" để hồ sơ CHƯA có chuyên mục vẫn hiện khi không lọc lĩnh vực.
     */
    @Query(value = "select s from Submission s left join s.category c "
            + "where (:status is null or s.status = :status) "
            + "and (:category is null or s.reportCategory = :category) "
            + "and (:field is null or c.name = :field)",
            countQuery = "select count(s) from Submission s left join s.category c "
            + "where (:status is null or s.status = :status) "
            + "and (:category is null or s.reportCategory = :category) "
            + "and (:field is null or c.name = :field)")
    Page<Submission> searchSubmissions(@Param("status") Submission.SubmissionStatus status,
                                       @Param("category") Submission.ReportCategory category,
                                       @Param("field") String field,
                                       Pageable pageable);

    /**
     * Bài nghiên cứu đã nộp, theo lĩnh vực và KẾT QUẢ DUYỆT của BTV:
     *   anyReview = true -> không lọc; review = null -> chỉ bài chờ duyệt; review = X -> chỉ bài có review_status = X.
     */
    @Query("select a from ResearchArticle a where a.status = :status and (:field is null or a.field = :field) "
            + "and (:anyReview = true or (:review is null and a.reviewStatus is null) or a.reviewStatus = :review)")
    Page<ResearchArticle> searchResearch(@Param("status") ResearchArticle.Status status,
                                         @Param("field") String field,
                                         @Param("anyReview") boolean anyReview,
                                         @Param("review") ResearchArticle.ReviewStatus review,
                                         Pageable pageable);

    /**
     * Màn "Biên tập bài viết": lọc theo lĩnh vực, tiêu đề và tình trạng biên tập.
     * Chỉ dòng YÊU CẦU CHỈNH SỬA mới có cột status (dòng duyệt / từ chối để trống), nên "r.status is not null"
     * nghĩa là "là yêu cầu chỉnh sửa". Tình trạng tính theo yêu cầu GẦN NHẤT (id lớn nhất):
     *   - notEdited = true     : bài chưa có yêu cầu nào
     *   - latestStatus != null : yêu cầu gần nhất đang ở đúng trạng thái này
     */
    @Query(value = "select a from ResearchArticle a where a.status = :status "
            + "and (:field is null or a.field = :field) "
            + "and (:keyword is null or lower(a.title) like lower(concat('%', :keyword, '%'))) "
            + "and (:notEdited = false or not exists (select r from EditoralReview r "
            + "     where r.researchArticle = a and r.status is not null)) "
            + "and (:latestStatus is null or exists (select r from EditoralReview r where r.researchArticle = a "
            + "     and r.status = :latestStatus and r.id = (select max(r2.id) from EditoralReview r2 "
            + "     where r2.researchArticle = a and r2.status is not null)))",
            countQuery = "select count(a) from ResearchArticle a where a.status = :status "
            + "and (:field is null or a.field = :field) "
            + "and (:keyword is null or lower(a.title) like lower(concat('%', :keyword, '%'))) "
            + "and (:notEdited = false or not exists (select r from EditoralReview r "
            + "     where r.researchArticle = a and r.status is not null)) "
            + "and (:latestStatus is null or exists (select r from EditoralReview r where r.researchArticle = a "
            + "     and r.status = :latestStatus and r.id = (select max(r2.id) from EditoralReview r2 "
            + "     where r2.researchArticle = a and r2.status is not null)))")
    Page<ResearchArticle> searchArticlesForEditing(@Param("status") ResearchArticle.Status status,
                                                   @Param("field") String field,
                                                   @Param("keyword") String keyword,
                                                   @Param("notEdited") boolean notEdited,
                                                   @Param("latestStatus") EditoralReview.RequestStatus latestStatus,
                                                   Pageable pageable);

    // ===================== CHUYÊN MỤC (bảng categories) =====================

    /** Tên các chuyên mục đang bật — danh sách cho ô lọc "Lĩnh vực". */
    @Query("select c.name from Category c where c.isActive = true order by c.name")
    List<String> findActiveCategoryNames();

    /** Phó TBT phụ trách chuyên mục đang bật có đúng tên này (tên chuyên mục = lĩnh vực bài nghiên cứu). */
    @Query("select c.deputyEic from Category c where c.name = :name and c.isActive = true")
    List<User> findDeputiesOfCategory(@Param("name") String name);

    @Query("select count(c) from Category c")
    long countCategories();

    /** 5 chuyên mục mặc định của toà soạn (tên trùng 5 lĩnh vực đầu của util/ExpertiseFields). */
    @Modifying
    @Query(value = "insert into categories (name, slug, is_active, created_at, updated_at) values "
            + "('Kinh tế', 'kinh-te', true, now(6), now(6)), "
            + "('Chính trị - Xã hội', 'chinh-tri-xa-hoi', true, now(6), now(6)), "
            + "('Pháp luật', 'phap-luat', true, now(6), now(6)), "
            + "('Đời sống', 'doi-song', true, now(6), now(6)), "
            + "('Khoa học - Môi trường', 'khoa-hoc-moi-truong', true, now(6), now(6))",
            nativeQuery = true)
    void insertDefaultCategories();
}
