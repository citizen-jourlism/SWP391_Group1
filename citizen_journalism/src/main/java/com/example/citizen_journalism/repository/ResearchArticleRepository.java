package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ResearchArticle;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** REPOSITORY cho bảng "research_articles" (bài nghiên cứu + bản nháp của Chuyên gia). Dùng ở ResearchArticleService. */
public interface ResearchArticleRepository extends JpaRepository<ResearchArticle, Long> {

    /** Bài của 1 chuyên gia theo trạng thái (bản nháp / đã nộp), có phân trang. */
    Page<ResearchArticle> findByAuthorIdAndStatus(String authorId, ResearchArticle.Status status, Pageable pageable);

    long countByAuthorIdAndStatus(String authorId, ResearchArticle.Status status);

    /** 1 bài, CHỈ khi đúng tác giả (người khác đổi id trên URL cũng không xem được). */
    Optional<ResearchArticle> findByIdAndAuthorId(Long id, String authorId);
}
