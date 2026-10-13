package com.example.citizen_journalism.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

/**
 * ENTITY = một bảng trong database. Lớp này ứng với bảng "otp_tokens"
 * (Hibernate tự tạo/cập nhật bảng nhờ spring.jpa.hibernate.ddl-auto=update).
 *
 * Mỗi dòng là MỘT lần gửi mã OTP. Kế thừa BaseEntity nên có sẵn: id, created_at, updated_at.
 *
 * TẠI SAO tách bảng riêng thay vì thêm cột otp vào bảng users?
 *   - Dùng chung cho nhiều mục đích (đăng ký, quên mật khẩu...) nhờ cột "purpose".
 *   - Lưu được lịch sử: mỗi lần gửi lại là 1 dòng mới, mã mới nhất mới có hiệu lực.
 *
 * BẢO MẬT: chỉ lưu bản BĂM của mã (code_hash), không lưu mã gốc.
 */
@Entity
@Table(name = "otp_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder // Cho phép tạo đối tượng kiểu OtpToken.builder().user(u).purpose(p)...build()
public class OtpToken extends BaseEntity {

    /** Mã này của người dùng nào. LAZY: chỉ tải thông tin user khi thật sự cần, đỡ tốn truy vấn. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Mục đích của mã (xem enum Purpose bên dưới). Lưu dạng chữ (STRING) cho dễ đọc trong DB. */
    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private Purpose purpose;

    /** Bản băm BCrypt của mã 6 số. */
    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    /** Thời điểm mã hết hạn (lúc tạo + 5 phút). */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Số lần đã nhập sai mã này. @Builder.Default: giá trị mặc định khi dùng builder. */
    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    /** Mã đã được dùng thành công chưa (dùng rồi thì không dùng lại được). */
    @Column(name = "used", nullable = false)
    @Builder.Default
    private boolean used = false;

    /**
     * Dữ liệu đi kèm mã (có thể null). Ví dụ với CHANGE_EMAIL: lưu EMAIL MỚI đang chờ xác nhận,
     * nhập đúng mã thì mới đổi sang email này (xem UserService.verifyEmailChange).
     */
    @Column(name = "payload", length = 255)
    private String payload;

    /** true nếu thời điểm hiện tại đã vượt quá expiresAt. */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /** Các mục đích sử dụng OTP. Thêm mục đích mới chỉ cần thêm 1 dòng ở đây. */
    public enum Purpose {
        REGISTER,       // xác thực tài khoản khi đăng ký
        RESET_PASSWORD, // quên mật khẩu
        CHANGE_EMAIL    // đổi email ở trang Hồ sơ (mã gửi tới EMAIL MỚI)
    }
}
