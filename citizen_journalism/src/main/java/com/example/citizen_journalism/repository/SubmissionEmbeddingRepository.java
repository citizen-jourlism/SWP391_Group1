package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEmbedding;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** REPOSITORY cho bảng "submission_embeddings" (kho truy xuất RAG của Kiểm tra tin trùng). */
public interface SubmissionEmbeddingRepository extends JpaRepository<SubmissionEmbedding, Long> {

    /** Các đoạn đã lưu của 1 hồ sơ, theo loại rồi thứ tự đoạn. */
    List<SubmissionEmbedding> findBySubmissionOrderByChunkTypeAscChunkIndexAsc(Submission submission);

    /** Các đoạn của nhiều hồ sơ cùng lúc (truy xuất ứng viên trùng). Kèm hồ sơ và tệp ảnh để khỏi truy vấn lẻ. */
    @Query("select e from SubmissionEmbedding e join fetch e.submission "
            + "where e.submission.id in :submissionIds")
    List<SubmissionEmbedding> findBySubmissionIds(@Param("submissionIds") Collection<Long> submissionIds);

    /** Id các hồ sơ (trong danh sách) đã có đoạn chữ tạo bằng model này. */
    @Query("select distinct e.submission.id from SubmissionEmbedding e "
            + "where e.submission.id in :submissionIds and e.model = :model")
    List<Long> findIndexedSubmissionIds(@Param("submissionIds") Collection<Long> submissionIds, @Param("model") String model);

    @Modifying
    @Query("delete from SubmissionEmbedding e where e.submission = :submission")
    void deleteBySubmission(@Param("submission") Submission submission);
}
