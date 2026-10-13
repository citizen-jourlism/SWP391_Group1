package com.example.citizen_journalism.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Type is required")
    @Column(name = "type", nullable = false, length = 30)
    private SubmissionType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull(message = "Author is required")
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_editor_id")
    private User assignedEditor;

    @NotBlank(message = "Title is required")
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @NotBlank(message = "Content is required")
    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "is_anonymous", nullable = false)
    @Builder.Default
    private Boolean isAnonymous = false;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Status is required")
    @Column(name = "status", nullable = false, length = 50)
    private SubmissionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 30)
    private Priority priority;

    @Column(name = "impact_score")
    private Integer impactScore;

    @Column(name = "is_spam")
    @Builder.Default
    private Boolean isSpam = false;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_submission_id")
    private Submission duplicateSubmission;

    @Column(name = "is_revealed")
    @Builder.Default
    private Boolean isRevealed = false;

    @Column(name = "reveal_reason", columnDefinition = "TEXT")
    private String revealReason;

    // ===== Các trường của FORM GỬI TIN / KHIẾU NẠI (SRS mục 4.1.1, xem SubmissionService.create) =====

    /** Loại phản ánh người gửi tự chọn trên form (Tin nóng 24/7, Khiếu nại/Tố cáo...). Quyết định luôn cột "type". */
    @Enumerated(EnumType.STRING)
    @Column(name = "report_category", length = 30)
    private ReportCategory reportCategory;

    /** Tóm tắt ngắn sự việc (tối đa 300 ký tự). */
    @Column(name = "summary", length = 300)
    private String summary;

    /** Thời điểm sự việc xảy ra (không được ở tương lai). */
    @Column(name = "incident_at")
    private LocalDateTime incidentAt;

    /** Tỉnh/thành nơi xảy ra sự việc (một giá trị trong util/VietnamProvinces). */
    @Column(name = "province", length = 50)
    private String province;

    /** Địa chỉ cụ thể / địa danh nhận biết. */
    @Column(name = "address", length = 250)
    private String address;

    /*
     * THÔNG TIN LIÊN HỆ người gửi điền trên form. Gửi ẨN DANH thì các cột này để NULL:
     * hệ thống KHÔNG lưu lại họ tên, SĐT, email, CCCD. Chỉ còn author_id (ai gửi) để phục vụ
     * việc Tổng biên tập giải mật khi có căn cứ pháp lý (is_revealed / reveal_reason).
     */
    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    /** CMND (9 số) hoặc CCCD (12 số), không bắt buộc. */
    @Column(name = "contact_citizen_id", length = 12)
    private String contactCitizenId;

    /** Mối quan hệ của người gửi với sự việc (không bắt buộc). */
    @Enumerated(EnumType.STRING)
    @Column(name = "reporter_relationship", length = 30)
    private ReporterRelationship reporterRelationship;

    /**
     * MÃ HỒ SƠ để tra cứu, dạng "KB-2026-0001" (năm + số thứ tự). Đặt ngay sau khi lưu (cần id).
     * Đi kèm MÃ PIN 6 số; DB chỉ lưu BẢN BĂM của PIN (pin_hash), giống cách lưu mật khẩu.
     */
    @Column(name = "tracking_code", unique = true, length = 20)
    private String trackingCode;

    @Column(name = "pin_hash", length = 100)
    private String pinHash;

    /**
     * CHỐNG DÒ MÃ PIN khi tra cứu (xem SubmissionTrackingService): đếm số lần nhập SAI PIN liên tiếp,
     * sai quá số lần cho phép thì tạm khoá tra cứu hồ sơ này tới thời điểm pin_locked_until.
     * columnDefinition "default 0": các dòng đã có trong DB tự nhận giá trị 0.
     */
    @Column(name = "pin_failed_attempts", nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int pinFailedAttempts = 0;

    @Column(name = "pin_locked_until")
    private LocalDateTime pinLockedUntil;

    /**
     * Loại phản ánh trên form (SRS: Tin nóng 24/7, Khiếu nại/Tố cáo, Phóng sự điều tra, Ý kiến chuyên gia).
     * Mỗi loại ứng với một quy trình xử lý (SubmissionType): tin nóng đi theo luồng Tin nóng,
     * các loại còn lại đi theo luồng tiếp nhận Khiếu nại (SRS 2.1.3: BTV kiểm tra giá trị báo chí...).
     */
    @Getter
    @RequiredArgsConstructor
    public enum ReportCategory {
        HOT_NEWS(SubmissionType.HOT_NEWS),
        COMPLAINT(SubmissionType.COMPLAINT),
        INVESTIGATION(SubmissionType.COMPLAINT),
        EXPERT_OPINION(SubmissionType.COMPLAINT);

        private final SubmissionType submissionType;
    }

    /** Mối quan hệ với sự việc: nạn nhân trực tiếp, nhân chứng, đại diện pháp lý, chuyên gia độc lập. */
    public enum ReporterRelationship {
        DIRECT_VICTIM,
        EYEWITNESS,
        LEGAL_REPRESENTATIVE,
        INDEPENDENT_EXPERT
    }

    public enum SubmissionType {
        HOT_NEWS,
        COMPLAINT,
        CONTRIBUTOR_POST,
        RESEARCH_PAPER
    }

    public enum SubmissionStatus {
        PENDING,
        CANCELLED,
        IN_REVIEW,
        NEED_MORE_INFO,
        REJECTED,
        DEPUTY_PENDING,
        DEPUTY_REJECTED,
        EIC_PENDING,
        EIC_REJECTED,
        READY_FOR_PUBLISHING,
        PUBLISHED,
        CORRECTED,
        RETRACTED
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        BREAKING
    }

}
