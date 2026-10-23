package com.example.citizen_journalism.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * BÀI NGHIÊN CỨU của Chuyên gia (vai trò EXPERT): một bài luận dài, có hình ảnh minh hoạ và tài liệu tham khảo.
 *
 * VÒNG ĐỜI:
 *   DRAFT     : bản nháp - chuyên gia viết dần, lưu bao nhiêu lần cũng được, sửa / xoá thoải mái
 *               (chức năng "Quản lý bản nháp"). Bản nháp chưa cần đủ các ô bắt buộc.
 *   SUBMITTED : đã nộp cho toà soạn - KHÔNG sửa / xoá được nữa. Khi nộp phải đủ các ô (ResearchArticleService.validateForSubmit).
 *
 * TẠI SAO bảng riêng mà không dùng chung bảng submissions? Bản nháp cần lưu khi còn dở dang (thiếu tiêu đề, nội dung...)
 * và có nhiều trường riêng (tóm tắt, từ khoá, tài liệu tham khảo, xung đột lợi ích). Để riêng thì bảng submissions
 * của tin nóng / khiếu nại không bị lẫn các dòng nháp.
 */
@Entity
@Table(name = "research_articles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchArticle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    /** Tiêu đề (bản nháp có thể để trống). */
    @Column(name = "title", length = 250)
    private String title;

    /** Tóm tắt bài (abstract). */
    @Column(name = "abstract_text", columnDefinition = "TEXT")
    private String abstractText;

    /** Lĩnh vực nghiên cứu (một giá trị trong util/ExpertiseFields). */
    @Column(name = "field", length = 50)
    private String field;

    /** Từ khoá, ngăn cách bằng dấu phẩy. */
    @Column(name = "keywords", length = 255)
    private String keywords;

    /**
     * Nội dung bài. Chữ thường, có vài quy ước định dạng đơn giản (xem frontend components/research/ArticleBody.jsx):
     * dòng bắt đầu "## " là tiêu đề mục, "- " là gạch đầu dòng, **chữ** là in đậm.
     */
    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    /** Tài liệu tham khảo, mỗi dòng 1 nguồn. Tên cột tránh chữ "references" vì đó là từ khoá của MySQL. */
    @Column(name = "reference_list", columnDefinition = "TEXT")
    private String referenceList;

    /** Có xung đột lợi ích không (null = chưa khai). */
    @Column(name = "has_conflict")
    private Boolean hasConflict;

    /** Mô tả xung đột lợi ích (bắt buộc khi hasConflict = true). */
    @Column(name = "conflict_note", columnDefinition = "TEXT")
    private String conflictNote;

    /** Hình ảnh minh hoạ dạng JSON: [{"url","name","size","caption"}, ...] theo đúng thứ tự trong bài. */
    @Column(name = "images", columnDefinition = "JSON")
    private String images;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    public enum Status {
        DRAFT,
        SUBMITTED
    }
}
