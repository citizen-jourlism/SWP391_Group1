package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.auth.OtpInfo;
import com.example.citizen_journalism.entity.OtpToken;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.OtpTokenRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Tạo, gửi và kiểm tra mã OTP 6 số. Dùng chung cho mọi luồng cần OTP
 * (đăng ký, quên mật khẩu...) thông qua OtpToken.Purpose.
 */
@Service
@RequiredArgsConstructor
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpTokenRepository otpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${app.otp.ttl-seconds:300}")
    private long ttlSeconds;

    @Value("${app.otp.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    /** Sinh mã mới (mã cũ tự động vô hiệu) và gửi qua email. Chặn gửi liên tục trong thời gian chờ. */
    public OtpInfo issue(User user, OtpToken.Purpose purpose) {
        latest(user, purpose).ifPresent(token -> {
            long waited = Duration.between(token.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (waited < resendCooldownSeconds) {
                throw AppException.tooManyRequests(
                        "Mã OTP vừa được gửi. Vui lòng đợi " + (resendCooldownSeconds - waited) + " giây để gửi lại.");
            }
        });

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        otpTokenRepository.save(OtpToken.builder()
                .user(user)
                .purpose(purpose)
                .codeHash(passwordEncoder.encode(code))
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .build());

        mailService.send(user.getEmail(), subjectOf(purpose), buildEmail(user.getFullName(), code, purpose));
        return new OtpInfo(user.getEmail(), ttlSeconds, resendCooldownSeconds);
    }

    /**
     * Kiểm tra mã. Ném AppException nếu sai/hết hạn.
     * Lưu ý: method gọi tới cần dùng @Transactional(noRollbackFor = AppException.class)
     * để số lần nhập sai vẫn được lưu lại khi ném lỗi.
     */
    public void verify(User user, OtpToken.Purpose purpose, String code) {
        OtpToken token = latest(user, purpose)
                .filter(t -> !t.isUsed())
                .orElseThrow(() -> AppException.badRequest("Mã OTP không còn hiệu lực. Vui lòng gửi lại mã mới."));

        if (token.isExpired()) {
            throw AppException.badRequest("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
        }
        if (token.getAttempts() >= maxAttempts) {
            throw AppException.badRequest("Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.");
        }
        if (!passwordEncoder.matches(code, token.getCodeHash())) {
            token.setAttempts(token.getAttempts() + 1);
            otpTokenRepository.save(token);
            int remaining = maxAttempts - token.getAttempts();
            throw AppException.badRequest(remaining > 0
                    ? "Mã OTP không đúng. Bạn còn " + remaining + " lần thử."
                    : "Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.");
        }
        token.setUsed(true);
        otpTokenRepository.save(token);
    }

    private Optional<OtpToken> latest(User user, OtpToken.Purpose purpose) {
        return otpTokenRepository.findTopByUserAndPurposeOrderByCreatedAtDescIdDesc(user, purpose);
    }

    private String subjectOf(OtpToken.Purpose purpose) {
        return switch (purpose) {
            case REGISTER -> "[Tin Nóng Dân Sinh] Mã xác thực tài khoản";
            case RESET_PASSWORD -> "[Tin Nóng Dân Sinh] Mã đặt lại mật khẩu";
        };
    }

    private String buildEmail(String fullName, String code, OtpToken.Purpose purpose) {
        String action = purpose == OtpToken.Purpose.REGISTER ? "xác thực tài khoản" : "đặt lại mật khẩu";
        return """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
                            border:1px solid #dfe5ef;border-radius:12px;color:#172339">
                  <h2 style="margin:0 0 4px;color:#0d1f35">TIN NÓNG DÂN SINH</h2>
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Mã OTP để %s của bạn là:</p>
                  <p style="font-size:32px;font-weight:800;letter-spacing:10px;color:#ff4500;margin:16px 0">%s</p>
                  <p>Mã có hiệu lực trong <b>%d phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                  <p style="color:#7a8190;font-size:12px">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
                </div>
                """.formatted(HtmlUtils.htmlEscape(fullName), action, code, ttlSeconds / 60);
    }
}
