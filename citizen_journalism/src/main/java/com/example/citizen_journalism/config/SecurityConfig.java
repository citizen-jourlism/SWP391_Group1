package com.example.citizen_journalism.config;

import com.example.citizen_journalism.security.ActiveUserJwtConverter;
import com.example.citizen_journalism.security.RestAuthenticationHandler;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cấu hình bảo mật (Spring Security): AI được gọi API NÀO.
 *
 * NGUYÊN TẮC PHÂN QUYỀN (đọc từ trên xuống, luật nào khớp trước thì áp dụng):
 *   1. PUBLIC_ENDPOINTS (đăng ký, đăng nhập, tra cứu) -> ai cũng gọi được
 *   2. /api/admin/**                               -> chỉ SYSTEM_ADMIN
 *      /api/submissions/**                         -> CITIZEN, CONTRIBUTOR, EXPERT (gửi tin / khiếu nại)
 *      /api/contributor-applications/**            -> CITIZEN, CONTRIBUTOR (đơn đăng ký Cộng tác viên)
 *      /api/editor/**                              -> chỉ EDITOR (bàn làm việc Biên tập viên)
 *      /api/leadership/**                          -> chỉ DEPUTY_EIC (duyệt khiếu nại mở khóa)
 *      /api/research/**                            -> chỉ EXPERT (bài nghiên cứu, bản nháp)
 *   3. /api/** còn lại                              -> phải đăng nhập (có token hợp lệ)
 *   4. Mọi thứ khác (file tĩnh...)                  -> mở, TRỪ /uploads/applications/** (giấy tờ tuỳ thân) bị chặn
 * Thêm API mới cần phân quyền theo vai trò: thêm 1 dòng .requestMatchers(...).hasRole(...) TRƯỚC dòng số 3.
 *
 * Cách xác thực: JWT gửi trong header "Authorization: Bearer <token>" (xem JwtConfig.java).
 * Không dùng session/cookie phía server (STATELESS): mỗi request tự mang token, backend không cần nhớ ai đang đăng nhập.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Các API công khai: người dùng CHƯA có token vẫn gọi được. */
    private static final Set<String> PUBLIC_ENDPOINTS = Set.of(
            "/api/auth/register",
            "/api/auth/verify-otp",
            "/api/auth/resend-otp",
            "/api/auth/login",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/appeals",
            "/api/appeals/status",
            "/api/tracking"); // Tra cứu hồ sơ bằng mã + PIN (TrackingController)

    private final RestAuthenticationHandler restAuthenticationHandler;
    private final ActiveUserJwtConverter activeUserJwtConverter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Tắt CSRF: frontend gọi API bằng JSON + token trong header, không dùng cookie phiên nên không bị tấn công CSRF.
            .csrf(AbstractHttpConfigurer::disable)
            // Không tạo session phía server: trạng thái đăng nhập nằm trong token.
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_ENDPOINTS.toArray(String[]::new)).permitAll()
                .requestMatchers("/api/admin/**").hasRole("SYSTEM_ADMIN")
                .requestMatchers("/api/leadership/**").hasRole("DEPUTY_EIC")
                // Gửi tin / khiếu nại: người dân, cộng tác viên, chuyên gia (nhân sự toà soạn và admin thì không)
                .requestMatchers("/api/submissions/**").hasAnyRole("CITIZEN", "CONTRIBUTOR", "EXPERT")
                // Đăng ký / theo dõi đơn Cộng tác viên: người dân (nộp đơn) và CTV (xem lại đơn cũ)
                .requestMatchers("/api/contributor-applications/**").hasAnyRole("CITIZEN", "CONTRIBUTOR")
                // Bài nghiên cứu + bản nháp: chỉ Chuyên gia
                .requestMatchers("/api/research/**", "/api/research").hasRole("EXPERT")
                // Bàn làm việc Biên tập viên
                .requestMatchers("/api/editor/**").hasRole("EDITOR")
                .requestMatchers("/api/**").authenticated()
                // Giấy tờ tuỳ thân của đơn CTV: KHÔNG cho xem trực tiếp qua /uploads, chỉ xem qua API có kiểm tra quyền
                .requestMatchers("/uploads/applications/**").denyAll()
                .anyRequest().permitAll()
            )
            // Bật chế độ "resource server": tự đọc + kiểm tra JWT ở mỗi request,
            // rồi đối chiếu tài khoản trong DB (bị khoá / đổi vai trò thì có hiệu lực ngay, xem ActiveUserJwtConverter).
            .oauth2ResourceServer(oauth2 -> oauth2
                .bearerTokenResolver(bearerTokenResolver())
                .jwt(jwt -> jwt.jwtAuthenticationConverter(activeUserJwtConverter))
                .authenticationEntryPoint(restAuthenticationHandler) // token sai/hết hạn -> 401 JSON
            )
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint(restAuthenticationHandler) // chưa có token -> 401 JSON
                .accessDeniedHandler(restAuthenticationHandler)      // sai vai trò -> 403 JSON
            )
            // Tắt trang đăng nhập mặc định và kiểu Basic của Spring: mình tự làm API đăng nhập riêng.
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }

    /**
     * Đọc token từ header Authorization, NHƯNG bỏ qua token ở các API công khai.
     * TẠI SAO? Nếu trình duyệt còn giữ một token cũ đã hết hạn, mặc định Spring sẽ từ chối (401) ngay cả
     * khi gọi API đăng nhập -> người dùng không đăng nhập lại được. Bỏ qua token ở các API công khai để tránh lỗi này.
     */
    private BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver defaultResolver = new DefaultBearerTokenResolver();
        return request -> PUBLIC_ENDPOINTS.contains(request.getRequestURI()) ? null : defaultResolver.resolve(request);
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
