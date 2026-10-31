package com.example.citizen_journalism.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Cấu hình JWT (JSON Web Token) – "thẻ ra vào" sau khi đăng nhập.
 *
 * JWT LÀ GÌ? Một chuỗi dạng "xxxxx.yyyyy.zzzzz" gồm 3 phần: header . nội dung (claims) . chữ ký.
 *   - Nội dung chứa: mã người dùng (sub), vai trò (role), thời điểm hết hạn (exp)...
 *   - Chữ ký được tạo bằng KHOÁ BÍ MẬT chỉ backend biết -> người dùng không thể tự sửa role thành admin,
 *     vì sửa nội dung thì chữ ký không còn khớp và backend sẽ từ chối.
 *
 * LUỒNG:
 *   Đăng nhập đúng -> JwtService dùng JwtEncoder TẠO token -> frontend lưu lại.
 *   Các request sau gửi kèm header "Authorization: Bearer <token>"
 *   -> Spring Security dùng JwtDecoder KIỂM TRA chữ ký + hạn dùng
 *   -> security/ActiveUserJwtConverter đối chiếu tài khoản trong DB (còn hoạt động không, vai trò hiện tại) để phân quyền.
 *
 * Thuật toán HS256 (HMAC-SHA256): dùng CÙNG MỘT khoá để ký và kiểm tra. Khoá phải dài >= 32 ký tự.
 * Khoá lấy từ biến JWT_SECRET (file .env); không có thì dùng khoá mặc định trong application.properties (chỉ để dev).
 */
@Configuration
public class JwtConfig {

    /** Khoá bí mật dùng chung cho việc ký và kiểm tra token. */
    @Bean
    public SecretKey jwtSecretKey(@Value("${app.jwt.secret}") String secret) {
        if (secret.length() < 32) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) phải dài ít nhất 32 ký tự");
        }
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    /** Bộ TẠO token (dùng trong JwtService khi đăng nhập thành công). */
    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    /** Bộ KIỂM TRA token (Spring Security tự gọi ở mỗi request có header Authorization). */
    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
    }
}
