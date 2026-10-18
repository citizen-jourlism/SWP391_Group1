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

/**
 * Tạo, gửi và kiểm tra mã OTP 6 số qua email.
 *
 * VỊ TRÍ: được AuthService và UserService gọi. DÙNG CHUNG cho mọi luồng cần OTP thông qua OtpToken.Purpose:
 *   - REGISTER       : xác thực tài khoản khi đăng ký
 *   - RESET_PASSWORD : quên mật khẩu
 *   - CHANGE_EMAIL   : đổi email ở trang Hồ sơ (mã gửi tới EMAIL MỚI)
 *
 * CÁC QUY TẮC BẢO MẬT (cấu hình trong application.properties, mục "OTP"):
 *   - Mã hết hạn sau app.otp.ttl-seconds (mặc định 300 giây = 5 phút)
 *   - Phải chờ app.otp.resend-cooldown-seconds (60 giây) giữa 2 lần gửi -> chống spam email
 *   - Nhập sai tối đa app.otp.max-attempts (5 lần) -> chống đoán mò mã
 *   - Mã được băm bằng BCrypt trước khi lưu -> lộ database cũng không đọc được mã
 */
@Service
@RequiredArgsConstructor
public class OtpService {

    // SecureRandom: sinh số ngẫu nhiên an toàn cho bảo mật (Random thường có thể bị đoán).
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpTokenRepository otpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    // @Value đọc giá trị từ application.properties; số sau dấu ":" là giá trị mặc định nếu không cấu hình.
    @Value("${app.otp.ttl-seconds:300}")
    private long ttlSeconds;

    @Value("${app.otp.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    /**
     * Sinh mã mới và gửi tới email HIỆN TẠI của người dùng (đăng ký, quên mật khẩu).
     * Mã cũ KHÔNG cần xoá: hệ thống luôn chỉ kiểm tra mã MỚI NHẤT, nên mã cũ tự vô hiệu.
     */
    public OtpInfo issue(User user, OtpToken.Purpose purpose) {
        return issue(user, purpose, user.getEmail(), null);
    }

    /**
     * Bản đầy đủ: gửi mã tới địa chỉ `recipient` (có thể KHÁC email hiện tại) và lưu kèm `payload`.
     * Dùng cho đổi email: gửi mã tới email MỚI, payload = email mới (xem UserService).
     */
    public OtpInfo issue(User user, OtpToken.Purpose purpose, String recipient, String payload) {
        // 1. Chặn gửi liên tục: nếu mã gần nhất được tạo chưa đủ thời gian chờ -> báo lỗi 429.
        latest(user, purpose).ifPresent(token -> {
            long waited = Duration.between(token.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (waited < resendCooldownSeconds) {
                throw AppException.tooManyRequests(
                        "Mã OTP vừa được gửi. Vui lòng đợi " + (resendCooldownSeconds - waited) + " giây để gửi lại.");
            }
        });

        // 2. Sinh mã 6 chữ số (000000 - 999999). %06d để giữ số 0 ở đầu, ví dụ 7 -> "000007".
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        // 3. Lưu bản BĂM của mã + thời điểm hết hạn vào bảng otp_tokens.
        otpTokenRepository.save(OtpToken.builder()
                .user(user)
                .purpose(purpose)
                .codeHash(passwordEncoder.encode(code))
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .payload(payload)
                .build());

        // 4. Gửi mã GỐC qua email (chỉ người dùng biết mã gốc).
        mailService.send(recipient, subjectOf(purpose), buildEmail(user.getFullName(), code, purpose));

        // 5. Trả thông tin thời gian để frontend hiện đồng hồ đếm ngược.
        return describe(recipient);
    }

    /**
     * Thông tin thời gian của một lần gửi OTP (KHÔNG gửi gì cả), kèm cờ cho biết mail có bị in ra console
     * thay vì gửi thật không.
     * Ngoài issue(), còn dùng ở "Quên mật khẩu" khi email KHÔNG tồn tại: vẫn trả về y hệt như đã gửi,
     * để người lạ không dò được email nào đã đăng ký (xem AuthService.forgotPassword).
     */
    public OtpInfo describe(String email) {
        return new OtpInfo(email, ttlSeconds, resendCooldownSeconds, !mailService.isLiveDelivery());
    }

    /**
     * Kiểm tra mã người dùng nhập. Đúng -> đánh dấu đã dùng và trả về token (để đọc payload nếu cần).
     * Sai/hết hạn -> ném AppException.
     *
     * LƯU Ý: method gọi tới hàm này phải dùng @Transactional(noRollbackFor = AppException.class),
     * nếu không thì số lần nhập sai (tăng ở bước 4) sẽ bị huỷ khi ném lỗi.
     */
    public OtpToken verify(User user, OtpToken.Purpose purpose, String code) {
        // 1. Lấy mã mới nhất CHƯA dùng. Không có -> phải gửi lại mã.
        OtpToken token = latest(user, purpose)
                .filter(t -> !t.isUsed())
                .orElseThrow(() -> AppException.badRequest("Mã OTP không còn hiệu lực. Vui lòng gửi lại mã mới."));

        // 2. Hết hạn?
        if (token.isExpired()) {
            throw AppException.badRequest("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
        }
        // 3. Đã sai quá số lần cho phép?
        if (token.getAttempts() >= maxAttempts) {
            throw AppException.badRequest("Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.");
        }
        // 4. So sánh mã nhập vào với bản băm (BCrypt tự băm mã nhập vào rồi so).
        if (!passwordEncoder.matches(code, token.getCodeHash())) {
            token.setAttempts(token.getAttempts() + 1);
            otpTokenRepository.save(token);
            int remaining = maxAttempts - token.getAttempts();
            throw AppException.badRequest(remaining > 0
                    ? "Mã OTP không đúng. Bạn còn " + remaining + " lần thử."
                    : "Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.");
        }
        // 5. Đúng -> đánh dấu đã dùng, để mã này không dùng lại được lần thứ hai.
        token.setUsed(true);
        return otpTokenRepository.save(token);
    }

    /** Mã OTP mới nhất của user cho một mục đích (REGISTER / RESET_PASSWORD / CHANGE_EMAIL). */
    private Optional<OtpToken> latest(User user, OtpToken.Purpose purpose) {
        return otpTokenRepository.findTopByUserAndPurposeOrderByCreatedAtDescIdDesc(user, purpose);
    }

    /** Tiêu đề email theo mục đích. "switch ->" là cú pháp switch gọn của Java 14+. */
    private String subjectOf(OtpToken.Purpose purpose) {
        return switch (purpose) {
            case REGISTER -> "[Tin Nóng Dân Sinh] Mã xác thực tài khoản";
            case RESET_PASSWORD -> "[Tin Nóng Dân Sinh] Mã đặt lại mật khẩu";
            case CHANGE_EMAIL -> "[Tin Nóng Dân Sinh] Mã xác nhận email mới";
        };
    }

    /**
     * Nội dung email dạng HTML (dùng text block """ ... """ của Java 15+, %s/%d được thay bằng .formatted()),
     * đặt trong khung chung MailService.layout.
     * MailService.escape(fullName): tên do người dùng tự nhập, nếu họ cố tình gõ mã HTML
     * (ví dụ thẻ <a> lừa đảo) thì sẽ bị biến thành chữ thường, không chạy được trong email.
     */
    private String buildEmail(String fullName, String code, OtpToken.Purpose purpose) {
        String action = switch (purpose) {
            case REGISTER -> "xác thực tài khoản";
            case RESET_PASSWORD -> "đặt lại mật khẩu";
            case CHANGE_EMAIL -> "xác nhận đổi sang email này";
        };
        return MailService.layout("""
                  <p>Xin chào <b>%s</b>,</p>
                  <p>Mã OTP để %s của bạn là:</p>
                  <p style="font-size:32px;font-weight:800;letter-spacing:10px;color:#ff4500;margin:16px 0">%s</p>
                  <p>Mã có hiệu lực trong <b>%d phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                  <p style="color:#7a8190;font-size:12px">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
                """.formatted(MailService.escape(fullName), action, code, ttlSeconds / 60));
    }
}
