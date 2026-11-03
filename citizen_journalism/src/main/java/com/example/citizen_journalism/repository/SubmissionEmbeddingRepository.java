package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.SubmissionEmbedding;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** REPOSITORY cho bảng "submission_embeddings" (kho truy xuất RAG của Kiểm tra tin trùng). */
public interface SubmissionEmbeddingRepository extends JpaRepository<SubmissionEmbedding, Long> {

    /** Các đoạn của nhiều hồ sơ cùng lúc (truy xuất ứng viên trùng). Kèm hồ sơ và tệp ảnh để khỏi truy vấn lẻ. */
    @Query("select e from SubmissionEmbedding e join fetch e.submission "
            + "where e.submission.id in :submissionIds")
    List<SubmissionEmbedding> findBySubmissionIds(@Param("submissionIds") Collection<Long> submissionIds);

    /** Xoá vector của 1 hồ sơ tạo bằng 1 model (trước khi lưu bản mới); vector của model khác giữ nguyên. */
    @Modifying
    @Query("delete from SubmissionEmbedding e where e.submission.id = :submissionId and e.model = :model")
    void deleteBySubmissionIdAndModel(@Param("submissionId") Long submissionId, @Param("model") String model);
}
