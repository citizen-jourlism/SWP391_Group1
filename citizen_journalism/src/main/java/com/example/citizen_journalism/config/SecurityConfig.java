package com.example.citizen_journalism.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cấu hình bảo mật (Spring Security): ai được gọi API nào, mật khẩu được mã hoá ra sao.
 *
 * HIỆN TẠI: mọi đường dẫn đều cho phép truy cập (permitAll) vì chưa có chức năng Đăng nhập.
 * Ở chức năng Đăng nhập (JWT) tiếp theo, file này sẽ được siết lại:
 * API công khai (/api/auth/**) vẫn mở, còn API khác bắt buộc đăng nhập và đúng vai trò.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Tắt CSRF: frontend React gọi API bằng JSON, không dùng form/cookie phiên kiểu truyền thống.
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/index.html", "/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
                .anyRequest().permitAll()
            )
            // Tắt trang đăng nhập mặc định và kiểu đăng nhập Basic của Spring: mình tự làm trang đăng nhập riêng.
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }

    /**
     * Bộ mã hoá dùng chung cho mật khẩu và mã OTP (được tiêm vào AuthService, OtpService).
     *
     * BCrypt là hàm băm MỘT CHIỀU: "abc12345" -> "$2a$10$Xy..." và không thể dịch ngược.
     * Khi đăng nhập/kiểm tra OTP chỉ cần so: passwordEncoder.matches(mãNhậpVào, bảnBăm).
     * Mỗi lần băm có thêm "muối" (salt) ngẫu nhiên, nên 2 người cùng mật khẩu vẫn ra 2 bản băm khác nhau.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
