package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * BÁO CÁO HIỆN TRƯỜNG của Cộng tác viên cho 1 nhiệm vụ: kết luận xác minh, những gì ghi nhận được, đề xuất.
 * Bài viết nháp và tư liệu CTV nộp nằm ở hồ sơ đầu ra (FieldAssignment.outputSubmission, loại CONTRIBUTOR_POST).
 * Mỗi nhiệm vụ có tối đa 1 báo cáo (unique trên assignment_id).
 */
@Entity
@Table(name = "field_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldReport extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @NotNull(message = "Assignment is required")
    @JoinColumn(name = "assignment_id", nullable = false, unique = true)
    private FieldAssignment assignment;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Conclusion is required")
    @Column(name = "conclusion", nullable = false, length = 30)
    private Conclusion conclusion;

    /** Kết quả ghi nhận tại hiện trường. */
    @NotBlank(message = "Findings are required")
    @Column(name = "findings", nullable = false, columnDefinition = "TEXT")
    private String findings;

    /** Tóm tắt lời nhân chứng, ý kiến chính quyền địa phương, trích dẫn tài liệu. */
    @NotBlank(message = "Witness statements are required")
    @Column(name = "witness_statements", nullable = false, columnDefinition = "TEXT")
    private String witnessStatements;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Recommendation is required")
    @Column(name = "recommendation", nullable = false, length = 30)
    private Recommendation recommendation;

    /** Kết luận xác minh sau khi đi thực địa. */
    public enum Conclusion {
        VERIFIED_TRUE,
        PARTIALLY_TRUE,
        UNFOUNDED
    }

    /** Đề xuất của Cộng tác viên cho toà soạn. */
    public enum Recommendation {
        PUBLISH,
        FURTHER_CHECK,
        DROP_CASE
    }
}
