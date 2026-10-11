package com.example.citizen_journalism.entity;

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

    @Column(name = "reputation_score")
    private Integer reputationScore;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    private void initializeDefaults() {
        if (reputationScore == null && role != null) {
            reputationScore = switch (role) {
                case CITIZEN -> 50;
                case CONTRIBUTOR -> 100;
                default -> null;
            };
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
