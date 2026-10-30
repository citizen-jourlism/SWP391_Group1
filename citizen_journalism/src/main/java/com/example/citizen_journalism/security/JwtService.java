package com.example.citizen_journalism.security;

import com.example.citizen_journalism.entity.User;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * TẠO token đăng nhập (JWT) cho người dùng. Được AuthService.login() gọi khi đăng nhập đúng.
 * Việc KIỂM TRA token do Spring Security tự làm (xem config/JwtConfig.java).
 *
 * Thời hạn token (cấu hình trong application.properties, mục "JWT"):
 *   - Bình thường: app.jwt.expiration-hours (mặc định 24 giờ)
 *   - Có tick "Ghi nhớ đăng nhập": app.jwt.remember-me-days (mặc định 7 ngày)
 * Hết hạn thì người dùng phải đăng nhập lại.
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    /** Tên hệ thống phát hành token (claim "iss"). */
    private static final String ISSUER = "tin-nong-dan-sinh";

    private final JwtEncoder jwtEncoder;

    @Value("${app.jwt.expiration-hours:24}")
    private long expirationHours;

    @Value("${app.jwt.remember-me-days:7}")
    private long rememberMeDays;

    /** Kết quả tạo token: chuỗi token + thời điểm hết hạn (để frontend biết). */
    public record IssuedToken(String value, Instant expiresAt) {
    }

    public IssuedToken issue(User user, boolean rememberMe) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(rememberMe ? Duration.ofDays(rememberMeDays) : Duration.ofHours(expirationHours));

        // Nội dung token. CHỈ để thông tin không nhạy cảm: ai cũng giải mã (đọc) được nội dung JWT,
        // chữ ký chỉ đảm bảo nội dung KHÔNG BỊ SỬA. Tuyệt đối không cho mật khẩu vào đây.
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getId())                  // "sub": mã người dùng, ví dụ CT0001
                .claim("role", user.getRole().name())   // dùng để phân quyền
                .claim("name", user.getFullName())
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }
}
