package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "evidences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evidence extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id")
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Uploader is required")
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @NotBlank(message = "File URL is required")
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    /** Loại tệp, suy ra từ định dạng khi tải lên (xem SubmissionService). */
    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", length = 20)
    private FileType fileType;

    /**
     * Thông tin đi kèm tệp, dạng JSON: tên gốc, dung lượng, định dạng.
     * Ví dụ: {"originalName":"hien-truong.jpg","size":204800,"contentType":"image/jpeg"}
     */
    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    @Column(name = "source_ref", length = 500)
    private String sourceRef;

    /** Phân loại tệp theo SRS: ảnh, video, ghi âm, tài liệu. */
    public enum FileType {
        IMAGE,
        VIDEO,
        AUDIO,
        DOCUMENT
    }

}
