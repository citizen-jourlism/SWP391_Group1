package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * KHO TRUY XUẤT (RAG) CỦA KIỂM TRA TIN TRÙNG — bảng "submission_embeddings".
 * Mỗi hồ sơ được cắt thành nhiều đoạn chữ: 1 đoạn tiêu đề và vài đoạn nội dung, mỗi đoạn lưu vector (embedding)
 * để tìm đoạn gần nghĩa nhất. Chỉ so chữ; ảnh, audio, video không xét (quyết định của nhóm 2026-11-03).
 * Xem DuplicateDetectionService (tạo + truy xuất) và DuplicateReviewService (màn Kiểm tra tin trùng).
 *
 * Vector của các model khác nhau KHÔNG so được với nhau, nên chỉ so các dòng cùng cột model.
 * MySQL không có kiểu vector: embedding lưu dạng JSON mảng số thực, độ giống (cosine) tính trong Java.
 */
@Entity
@Table(name = "submission_embeddings", indexes = {
        @Index(name = "idx_submission_embeddings_submission", columnList = "submission_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionEmbedding extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @Enumerated(EnumType.STRING)
    @Column(name = "chunk_type", nullable = false, length = 20)
    private ChunkType chunkType;

    /** Thứ tự đoạn trong hồ sơ (0, 1, 2...). */
    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    /** Nội dung đoạn chữ Dùng để biết hồ sơ đã đổi nội dung thì tạo lại vector. */
    @Column(name = "chunk_text", columnDefinition = "TEXT")
    private String chunkText;

    /** Vector dạng JSON, ví dụ "[0.0123,-0.0456,...]". */
    @Column(name = "embedding", columnDefinition = "LONGTEXT")
    private String embedding;

    /** Model tạo vector, ví dụ "gemini-embedding-001" hoặc "local-hash-v1" (khi không gọi được AI). */
    @Column(name = "model", nullable = false, length = 100)
    private String model;

    public enum ChunkType {
        TITLE,
        CONTENT
    }
}
