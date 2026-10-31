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
 *   SUBMITTED : đã nộp, chờ Biên tập viên xét duyệt.
 *   APPROVED  : đã được Biên tập viên xác minh là bài hợp lệ.
 *   Bài đã nộp không được tác giả sửa / xoá.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "editorial_note", columnDefinition = "TEXT")
    private String editorialNote;

    // ----- KẾT QUẢ DUYỆT CỦA BIÊN TẬP VIÊN (ResearchEditorialService) -----
    // Chỉ giữ 2 cột để lọc hàng đợi và hiện nhãn nhanh. Chi tiết (ai duyệt, lúc nào, ghi chú / lý do, điểm, Phó TBT)
    // nằm ở dòng APPROVE / REJECT của bảng editorial_reviews.
    // Cho phép NULL: bài cũ / bài vừa nộp có reviewStatus = null nghĩa là "chờ Biên tập viên duyệt".

    /** null = chờ BTV duyệt; DEPUTY_PENDING = đã duyệt, chuyển Phó TBT; REJECTED = BTV từ chối (dừng xử lý). */
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", columnDefinition = "VARCHAR(30)")
    private ReviewStatus reviewStatus;

    /** Cấp độ BTV phân loại khi duyệt (tính từ điểm, xem ResearchEditorialService.priorityOf). */
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", columnDefinition = "VARCHAR(20)")
    private Priority priority;

    public enum Status {
        DRAFT,
        SUBMITTED,
        APPROVED,
        REJECTED
    }

    public enum ReviewStatus {
        DEPUTY_PENDING,
        EIC_PENDING,
        READY_FOR_PUBLISHING,
        DEPUTY_REJECTED,
        EIC_REJECTED,
        REJECTED
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH
    }
}
