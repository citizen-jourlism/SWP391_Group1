package com.example.citizen_journalism.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * ĐƠN ĐĂNG KÝ LÀM CỘNG TÁC VIÊN (SRS: "Register as a Contributor" + "Track Contributor Application").
 *
 * QUY TRÌNH (SRS 2.3 + UC Editor "Review Citizen Upgrade Request", UC Phó TBT "Approve Citizen Upgrade Request"):
 *   1. Người dân nộp đơn                                  -> PENDING_EDITOR
 *   2. Biên tập viên xem hồ sơ: chuyển lên / từ chối        -> PENDING_DEPUTY / REJECTED
 *   3. Phó Tổng biên tập phê duyệt / từ chối               -> APPROVED (đổi vai trò thành CTV) / REJECTED
 *   Người dân có thể RÚT đơn khi Biên tập viên chưa xử lý  -> WITHDRAWN
 * Bước 3 sẽ làm cùng bàn làm việc của Phó TBT; các cột deputy_* đã có sẵn để khi đó dùng luôn.
 *
 * Mỗi bước lưu NGƯỜI xử lý + THỜI ĐIỂM + GHI CHÚ ngay trên đơn -> trang theo dõi dựng được tiến trình
 * mà không cần bảng nhật ký riêng (quy trình chỉ có 2 cấp duyệt cố định).
 *
 * Giấy tờ tải lên lưu trong uploads/applications (KHÔNG xem trực tiếp qua /uploads được, xem SecurityConfig);
 * danh sách tệp lưu dạng JSON ở cột documents.
 */
@Entity
@Table(name = "contributor_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContributorApplication extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull
    @JoinColumn(name = "applicant_id", nullable = false)
    private User applicant;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    // ----- Nội dung đơn -----

    /** Lĩnh vực am hiểu, nhiều giá trị nối bằng dấu phẩy, ví dụ "Đời sống,Pháp luật" (xem EXPERTISE_FIELDS). */
    @Column(name = "expertise_fields", nullable = false, length = 255)
    private String expertiseFields;

    /** Tỉnh/thành có thể tác nghiệp (một giá trị trong util/VietnamProvinces). */
    @Column(name = "province", nullable = false, length = 50)
    private String province;

    /** Nghề nghiệp hiện tại. */
    @Column(name = "occupation", nullable = false, length = 100)
    private String occupation;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability", nullable = false, length = 20)
    private Availability availability;

    /** Kinh nghiệm và lý do muốn làm CTV. */
    @Column(name = "experience", nullable = false, columnDefinition = "TEXT")
    private String experience;

    /** Danh sách giấy tờ dạng JSON: [{"name","url","contentType","size"}, ...]. */
    @Column(name = "documents", columnDefinition = "JSON")
    private String documents;

    // ----- Bước 2: Biên tập viên -----

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "editor_id")
    private User editor;

    @Column(name = "editor_note", columnDefinition = "TEXT")
    private String editorNote;

    @Column(name = "editor_reviewed_at")
    private LocalDateTime editorReviewedAt;

    // ----- Bước 3: Phó Tổng biên tập (làm ở phần sau) -----

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deputy_id")
    private User deputy;

    @Column(name = "deputy_note", columnDefinition = "TEXT")
    private String deputyNote;

    @Column(name = "deputy_reviewed_at")
    private LocalDateTime deputyReviewedAt;

    /** Thời điểm người dân rút đơn (nếu có). */
    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    public enum Status {
        PENDING_EDITOR,
        PENDING_DEPUTY,
        APPROVED,
        REJECTED,
        WITHDRAWN;

        /** Đơn còn đang được xét (chưa có kết quả cuối). Mỗi người chỉ được có 1 đơn như vậy. */
        public boolean isActive() {
            return this == PENDING_EDITOR || this == PENDING_DEPUTY;
        }
    }

    /** Thời gian có thể nhận nhiệm vụ. */
    public enum Availability {
        FULL_TIME,
        PART_TIME,
        WEEKENDS
    }
}
