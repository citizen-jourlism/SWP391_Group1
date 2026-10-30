package com.example.citizen_journalism.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "users", indexes = {
        // 1. Phục vụ tra cứu đăng nhập / kiểm tra trùng lặp số điện thoại
        @Index(name = "idx_users_phone", columnList = "phone"),

        // 2. Phục vụ màn hình Admin duyệt hồ sơ nâng cấp (lọc trạng thái + sắp xếp thời
        // gian)
        @Index(name = "idx_users_upgrade_created", columnList = "upgrade_status, created_at"),

        // 3. Phục vụ lọc nhân sự tòa soạn (phân vai trò và trạng thái hoạt động)
        @Index(name = "idx_users_role_status", columnList = "role, status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "id", length = 10)
    private String id;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Role is required")
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    @NotBlank(message = "Full name is required")
    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @NotBlank(message = "Phone is required")
    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    /**
     * Tên đăng nhập (không bắt buộc). Hiện chỉ tài khoản quản trị dùng (ví dụ "Admin", xem AdminAccountInitializer);
     * người dùng thường đăng nhập bằng email. Đăng nhập: AuthService.login() nhận email HOẶC tên đăng nhập.
     */
    @Column(name = "username", unique = true, length = 50)
    private String username;

    @NotBlank(message = "Password is required")
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Status is required")
    @Column(name = "status", nullable = false, length = 30)
    private Status status;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "expertise_fields", columnDefinition = "TEXT")
    private String expertiseFields;

    @Column(name = "credentials_file_data", columnDefinition = "LONGBLOB")
    private byte[] credentialsFileData;

    @Column(name = "credentials_files_meta", columnDefinition = "JSON")
    private String credentialsFilesMeta;

    @Enumerated(EnumType.STRING)
    @Column(name = "upgrade_status", length = 30)
    @Builder.Default
    private UpgradeStatus upgradeStatus = UpgradeStatus.NONE;

    /** Điểm uy tín. Tài khoản mới mặc định DEFAULT_REPUTATION_SCORE (xem initializeDefaults). Người dùng chỉ được xem. */
    @Column(name = "reputation_score")
    private Integer reputationScore;

    /**
     * Điểm hiệu suất: CHỈ DÀNH CHO CỘNG TÁC VIÊN, thay thế hoàn toàn điểm uy tín của vai trò này
     * (người dân, chuyên gia... vẫn dùng điểm uy tín). Các vai trò khác để NULL.
     * Biên tập viên dựa vào điểm này để chọn CTV khi giao nhiệm vụ. Người dùng chỉ được xem.
     */
    @Column(name = "performance_score")
    private Integer performanceScore;

    /** Điểm thưởng tích luỹ (đổi quà sau này). Mặc định 0, người dùng chỉ được xem. */
    @Column(name = "reward_points", nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int rewardPoints = 0;

    // ----- Thông tin hồ sơ cá nhân (trang Hồ sơ, xem UserService) -----

    /** Số căn cước công dân. Không bắt buộc; nếu có thì không được trùng với người khác. */
    @Column(name = "citizen_id", unique = true, length = 20)
    private String citizenId;

    /** Tỉnh/thành phố (một giá trị trong util/VietnamProvinces). Với CTV đây là khu vực dùng để ghép với nơi xảy ra vụ việc. */
    @Column(name = "province", length = 50)
    private String province;

    /** Phường/xã, phải thuộc đúng tỉnh ở trên (LocationService). */
    @Column(name = "ward", length = 100)
    private String ward;

    /** Phần còn lại của địa chỉ: số nhà, ngõ, đường. */
    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    /** Đường dẫn ảnh đại diện, ví dụ "/uploads/avatars/CT0001-a1b2c3.png" (file nằm trong thư mục uploads của project). */
    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    /**
     * Số lần nhập SAI mật khẩu liên tiếp (chống dò mật khẩu). Đăng nhập đúng thì về 0.
     * Xem AuthService.login(). columnDefinition "default 0" để các dòng cũ trong DB tự có giá trị 0.
     */
    @Column(name = "failed_login_attempts", nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int failedLoginAttempts = 0;

    /**
     * Khoá TẠM THỜI tới thời điểm này do nhập sai mật khẩu quá nhiều lần (null = không bị khoá).
     * Khác với status = LOCKED (khoá do vi phạm, chỉ admin/Ban biên tập mở được).
     * Hết thời gian thì tự mở khi người dùng đăng nhập lại, không cần job chạy nền.
     */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Điểm uy tín mặc định của mọi tài khoản mới. */
    public static final int DEFAULT_REPUTATION_SCORE = 100;

    /** Điểm hiệu suất khởi đầu khi một tài khoản trở thành Cộng tác viên. */
    public static final int DEFAULT_PERFORMANCE_SCORE = 100;

    /**
     * Gán giá trị mặc định, chạy tự động ngay trước khi tạo mới (@PrePersist) hoặc cập nhật (@PreUpdate) tài khoản.
     * Có @PreUpdate để tài khoản được ĐỔI vai trò thành Cộng tác viên cũng tự nhận điểm hiệu suất khởi đầu.
     */
    @PrePersist
    @PreUpdate
    private void initializeDefaults() {
        if (reputationScore == null) {
            reputationScore = DEFAULT_REPUTATION_SCORE;
        }
        if (role == Role.CONTRIBUTOR && performanceScore == null) {
            performanceScore = DEFAULT_PERFORMANCE_SCORE;
        }
    }

    /** Điểm hiệu suất để hiển thị và xếp hạng: CTV cũ chưa có điểm thì tính bằng điểm khởi đầu. */
    public int performanceScoreOrDefault() {
        return performanceScore == null ? DEFAULT_PERFORMANCE_SCORE : performanceScore;
    }

    /**
     * Các vai trò trong hệ thống. Mỗi vai trò có tiền tố 2 chữ cái để sinh mã người dùng
     * (xem util/UserIdGenerator), ví dụ: Người dân -> CT0001, Admin -> AD0001.
     * Muốn đổi tiền tố thì chỉ cần sửa chuỗi trong ngoặc ở đây.
     */
    @Getter                     // Lombok tạo hàm getIdPrefix()
    @RequiredArgsConstructor    // Lombok tạo constructor nhận idPrefix cho từng giá trị enum
    public enum Role {
        CITIZEN("CT"),
        CONTRIBUTOR("CB"),
        EXPERT("EX"),
        EDITOR("ED"),
        DEPUTY_EIC("DE"),
        EIC("EC"),
        SYSTEM_ADMIN("AD");

        private final String idPrefix;
    }

    public enum Status {
        PENDING_OTP,
        ACTIVE,
        LOCKED
    }

    public enum UpgradeStatus {
        NONE,
        PENDING,
        APPROVED,
        REJECTED
    }
}
