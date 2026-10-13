package com.example.citizen_journalism.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "users")
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

    /** Điểm thưởng tích luỹ (đổi quà sau này). Mặc định 0, người dùng chỉ được xem. */
    @Column(name = "reward_points", nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private int rewardPoints = 0;

    // ----- Thông tin hồ sơ cá nhân (trang Hồ sơ, xem UserService) -----

    /** Số căn cước công dân. Không bắt buộc; nếu có thì không được trùng với người khác. */
    @Column(name = "citizen_id", unique = true, length = 20)
    private String citizenId;

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

    /** Chạy tự động ngay TRƯỚC khi lưu tài khoản mới vào DB lần đầu (@PrePersist): gán giá trị mặc định. */
    @PrePersist
    private void initializeDefaults() {
        if (reputationScore == null) {
            reputationScore = DEFAULT_REPUTATION_SCORE;
        }
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
