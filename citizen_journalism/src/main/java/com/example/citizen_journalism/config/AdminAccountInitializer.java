package com.example.citizen_journalism.config;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import com.example.citizen_journalism.util.UserIdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * TỰ TẠO TÀI KHOẢN QUẢN TRỊ (SYSTEM_ADMIN) mỗi khi backend khởi động, NẾU hệ thống chưa có admin nào.
 *
 * TẠI SAO? Admin là người tạo tài khoản cho người khác, nên không thể tự "đăng ký" như người dân.
 * Phải có sẵn một tài khoản admin đầu tiên.
 *
 * CHỈ CÓ 1 ADMIN: đã có admin rồi thì lớp này không làm gì (cũng không ghi đè mật khẩu nếu admin đã tự đổi).
 * AdminService cũng chặn tạo thêm / đổi vai trò thành SYSTEM_ADMIN.
 *
 * Thông tin admin lấy từ file .env (git bỏ qua, xem .env.example): ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL...
 * Không khai báo ADMIN_PASSWORD -> bỏ qua, không tạo (tránh tạo admin với mật khẩu mặc định ai cũng biết).
 *
 * ApplicationRunner: Spring tự gọi run() một lần ngay sau khi ứng dụng khởi động xong.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserIdGenerator userIdGenerator;

    @Value("${app.admin.username:Admin}")
    private String username;

    @Value("${app.admin.password:}")
    private String password;

    @Value("${app.admin.email:}")
    private String email;

    @Value("${app.admin.phone:0900000000}")
    private String phone;

    @Value("${app.admin.full-name:Quản trị hệ thống}")
    private String fullName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(User.Role.SYSTEM_ADMIN)) {
            return; // Đã có admin -> giữ nguyên
        }
        if (password.isBlank() || email.isBlank()) {
            log.warn("Chưa có tài khoản quản trị và chưa cấu hình ADMIN_PASSWORD / ADMIN_EMAIL trong .env -> bỏ qua việc tạo admin.");
            return;
        }

        User admin = User.builder()
                .id(userIdGenerator.next(User.Role.SYSTEM_ADMIN)) // AD0001
                .role(User.Role.SYSTEM_ADMIN)
                .status(User.Status.ACTIVE)
                .isVerified(true)
                .username(username.trim())
                .email(TextUtils.normalizeEmail(email))
                .phone(phone.trim())
                .fullName(fullName.trim())
                .passwordHash(passwordEncoder.encode(password))
                .build();
        userRepository.save(admin);
        log.info("Đã tạo tài khoản quản trị {} (tên đăng nhập: {}).", admin.getId(), admin.getUsername());
    }
}
