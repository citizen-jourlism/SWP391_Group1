package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.normalizeEmail;

import com.example.citizen_journalism.dto.auth.ChangePasswordRequest;
import com.example.citizen_journalism.dto.auth.LoginRequest;
import com.example.citizen_journalism.dto.auth.LoginResponse;
import com.example.citizen_journalism.dto.auth.OtpInfo;
import com.example.citizen_journalism.dto.auth.RegisterRequest;
import com.example.citizen_journalism.dto.auth.ResetPasswordRequest;
import com.example.citizen_journalism.dto.auth.VerifyOtpRequest;
import com.example.citizen_journalism.dto.user.UserSummary;
import com.example.citizen_journalism.entity.OtpToken;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.exception.ErrorCode;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.security.JwtService;
import com.example.citizen_journalism.util.UserIdGenerator;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * SERVICE = "bộ não" xử lý nghiệp vụ tài khoản (đăng ký, xác thực OTP, đăng nhập...).
 *
 * VỊ TRÍ: được AuthController gọi; bản thân nó gọi xuống
 *   - UserRepository   : đọc/ghi bảng users
 *   - OtpService       : sinh/gửi/kiểm tra mã OTP
 *   - PasswordEncoder  : mã hoá / so khớp mật khẩu (BCrypt)
 *   - UserIdGenerator  : sinh mã người dùng (CT0001...)
 *   - JwtService       : tạo token đăng nhập
 *
 * Các nhóm chức năng: ĐĂNG KÝ + OTP -> ĐĂNG NHẬP -> QUÊN / ĐỔI MẬT KHẨU (theo thứ tự trong file).
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    /** Thông báo CHUNG khi sai tài khoản hoặc sai mật khẩu (không tiết lộ tài khoản có tồn tại hay không). */
    private static final String INVALID_CREDENTIALS = "Tài khoản hoặc mật khẩu không đúng.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserIdGenerator userIdGenerator;
    private final OtpService otpService;
    private final JwtService jwtService;

    // Chống dò mật khẩu: sai liên tiếp maxLoginAttempts lần thì khoá tạm lockMinutes phút (application.properties).
    @Value("${app.auth.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.auth.lock-minutes:15}")
    private long lockMinutes;

    /**
     * Đăng ký tài khoản Người dân (role CITIZEN) ở trạng thái PENDING_OTP rồi gửi OTP.
     *
     * Trường hợp đặc biệt: email đã đăng ký nhưng CHƯA xác thực (ví dụ người dùng gõ sai,
     * đóng trang, quên mã...) -> cho phép đăng ký lại: cập nhật thông tin + gửi mã mới,
     * thay vì báo "email đã tồn tại" khiến họ bị kẹt.
     *
     * @Transactional: mọi thao tác DB trong hàm là MỘT giao dịch. Nếu gửi mail lỗi
     * (ném exception) thì việc lưu user cũng bị huỷ (rollback) -> không có tài khoản "mồ côi".
     */
    @Transactional
    public OtpInfo register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        // Tìm user theo email: có rồi thì kiểm tra trạng thái, chưa có thì tạo đối tượng mới.
        User user = userRepository.findByEmail(email)
                .map(existing -> {
                    if (existing.getStatus() != User.Status.PENDING_OTP) {
                        // Đã ACTIVE/LOCKED -> email thật sự đã có chủ.
                        throw AppException.conflict("Email này đã được đăng ký. Vui lòng đăng nhập.");
                    }
                    return existing; // Chưa xác thực -> dùng lại bản ghi cũ.
                })
                .orElseGet(() -> User.builder()
                        .id(userIdGenerator.next(User.Role.CITIZEN)) // Ví dụ: CT0007
                        .role(User.Role.CITIZEN)                     // Đăng ký công khai luôn là Người dân
                        .status(User.Status.PENDING_OTP)             // Chờ nhập OTP mới được dùng
                        .email(email)
                        .build());

        // Gán (hoặc cập nhật) thông tin người dùng nhập vào.
        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone().trim());
        // KHÔNG BAO GIỜ lưu mật khẩu gốc: chỉ lưu bản băm BCrypt (không giải ngược được).
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        return otpService.issue(user, OtpToken.Purpose.REGISTER);
    }

    /**
     * Kiểm tra OTP đăng ký; đúng thì kích hoạt tài khoản (ACTIVE + isVerified = true).
     *
     * noRollbackFor = AppException.class: khi nhập SAI, OtpService tăng biến đếm "số lần sai"
     * rồi ném AppException. Nếu để mặc định thì Spring sẽ rollback luôn việc tăng biến đếm đó
     * -> người dùng có thể đoán mã vô hạn lần. Dòng này giữ lại số lần sai.
     */
    @Transactional(noRollbackFor = AppException.class)
    public void verifyRegistration(VerifyOtpRequest request) {
        User user = findPendingUser(request.email());
        otpService.verify(user, OtpToken.Purpose.REGISTER, request.otp()); // Sai -> ném lỗi, dừng ở đây
        user.setStatus(User.Status.ACTIVE);
        user.setIsVerified(true);
        // Không cần gọi save(): user đang được JPA "quản lý" trong transaction,
        // thay đổi sẽ tự được ghi xuống DB khi hàm kết thúc.
    }

    /** Gửi lại mã OTP cho tài khoản đang chờ xác thực (OtpService tự chặn gửi quá nhanh). */
    @Transactional
    public OtpInfo resendRegistrationOtp(String email) {
        return otpService.issue(findPendingUser(email), OtpToken.Purpose.REGISTER);
    }

    /**
     * Đăng nhập: kiểm tra email (hoặc tên đăng nhập) + mật khẩu, đúng thì trả về token JWT.
     *
     * THỨ TỰ KIỂM TRA (có chủ đích):
     *   1. Không tìm thấy tài khoản       -> 401 thông báo chung (không cho biết tài khoản có tồn tại hay không)
     *   2. Đang bị khoá tạm do sai nhiều  -> 429 "thử lại sau X phút"
     *   3. Sai mật khẩu                   -> tăng biến đếm, đủ số lần thì khoá tạm; 401 thông báo chung
     *   4. ĐÚNG mật khẩu rồi mới báo trạng thái tài khoản (chưa xác thực / bị khoá) -> 403 kèm mã lỗi.
     *      Đặt sau bước 3 để chỉ chủ tài khoản thật (biết mật khẩu) mới thấy được các thông tin này.
     *   5. Hợp lệ -> reset biến đếm, tạo token.
     *
     * noRollbackFor: khi sai mật khẩu vẫn phải LƯU số lần sai dù có ném lỗi (giống verifyRegistration).
     */
    @Transactional(noRollbackFor = AppException.class)
    public LoginResponse login(LoginRequest request) {
        User user = findByIdentifier(request.identifier())
                .orElseThrow(() -> AppException.unauthorized(INVALID_CREDENTIALS));

        LocalDateTime now = LocalDateTime.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            long minutesLeft = Math.max(1, Duration.between(now, user.getLockedUntil()).toMinutes() + 1);
            throw AppException.tooManyRequests(
                    "Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau " + minutesLeft + " phút.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            if (registerFailedLogin(user, now)) {
                throw AppException.tooManyRequests("Bạn đã nhập sai mật khẩu " + maxLoginAttempts
                        + " lần. Tài khoản tạm khoá đăng nhập trong " + lockMinutes + " phút.");
            }
            throw AppException.unauthorized(INVALID_CREDENTIALS);
        }

        // Đúng mật khẩu -> xoá dấu vết các lần sai trước đó.
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        if (user.getStatus() == User.Status.PENDING_OTP) {
            throw AppException.forbidden("Tài khoản chưa xác thực email. Vui lòng xác thực để đăng nhập.",
                    ErrorCode.ACCOUNT_NOT_VERIFIED);
        }
        if (user.getStatus() == User.Status.LOCKED) {
            throw AppException.forbidden("Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.",
                    ErrorCode.ACCOUNT_LOCKED);
        }

        JwtService.IssuedToken token = jwtService.issue(user, request.isRememberMe());
        return new LoginResponse(token.value(), token.expiresAt(), UserSummary.from(user));
    }

    /**
     * Thông tin người đang đăng nhập (GET /api/auth/me). userId lấy từ token (claim "sub").
     * Frontend gọi mỗi khi mở web để kiểm tra token còn dùng được không. Đọc lại từ DB (không tin hẳn vào token)
     * vì có thể tài khoản đã bị khoá/xoá SAU khi token được cấp.
     */
    @Transactional(readOnly = true)
    public UserSummary getCurrentUser(String userId) {
        return UserSummary.from(userRepository.getActiveById(userId));
    }

    // ======================= QUÊN MẬT KHẨU / ĐỔI MẬT KHẨU =======================

    /**
     * Quên mật khẩu - bước 1: gửi mã OTP (mục đích RESET_PASSWORD) tới email.
     *
     * CHỐNG DÒ EMAIL: chỉ thật sự gửi mã khi email thuộc một tài khoản ACTIVE. Các trường hợp còn lại
     * (không tồn tại, chưa xác thực, bị khoá) vẫn trả về Y HỆT như đã gửi, để người lạ không thể
     * nhập thử hàng loạt email để biết email nào đã đăng ký.
     */
    @Transactional
    public OtpInfo forgotPassword(String email) {
        String normalized = normalizeEmail(email);
        return userRepository.findByEmail(normalized)
                .filter(user -> user.getStatus() == User.Status.ACTIVE)
                .map(user -> otpService.issue(user, OtpToken.Purpose.RESET_PASSWORD))
                .orElseGet(() -> otpService.describe(normalized));
    }

    /**
     * Quên mật khẩu - bước 2: kiểm tra OTP rồi đặt mật khẩu mới.
     * Email không hợp lệ thì báo giống hệt "mã không còn hiệu lực" (cũng để chống dò email).
     * noRollbackFor: giữ lại số lần nhập sai OTP khi ném lỗi (giống verifyRegistration).
     */
    @Transactional(noRollbackFor = AppException.class)
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .filter(found -> found.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() -> AppException.badRequest("Mã OTP không còn hiệu lực. Vui lòng gửi lại mã mới."));
        otpService.verify(user, OtpToken.Purpose.RESET_PASSWORD, request.otp());
        applyNewPassword(user, request.newPassword());
    }

    /**
     * Đổi mật khẩu khi ĐÃ đăng nhập (userId lấy từ token).
     * Bắt buộc nhập đúng mật khẩu hiện tại, và mật khẩu mới phải khác mật khẩu cũ.
     */
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.getActiveById(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw AppException.badRequest("Mật khẩu hiện tại không đúng.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw AppException.badRequest("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        applyNewPassword(user, request.newPassword());
    }

    /**
     * Lưu mật khẩu mới (dạng băm) và mở khoá tạm nếu có.
     * Dùng chung cho đặt lại mật khẩu và đổi mật khẩu: người vừa chứng minh được mình là chủ tài khoản
     * (qua OTP hoặc mật khẩu cũ) thì không cần chờ hết thời gian khoá do nhập sai trước đó.
     */
    private void applyNewPassword(User user, String rawPassword) {
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
    }

    /** Có "@" -> tìm theo email; không có -> tìm theo tên đăng nhập (không phân biệt hoa thường). */
    private Optional<User> findByIdentifier(String identifier) {
        String value = identifier.trim();
        return value.contains("@")
                ? userRepository.findByEmail(normalizeEmail(value))
                : userRepository.findByUsernameIgnoreCase(value);
    }

    /**
     * Ghi nhận 1 lần sai mật khẩu; đủ maxLoginAttempts lần thì khoá tạm và đếm lại từ 0.
     * @return true nếu lần sai này vừa làm tài khoản bị khoá tạm
     */
    private boolean registerFailedLogin(User user, LocalDateTime now) {
        int attempts = user.getFailedLoginAttempts() + 1;
        boolean locked = attempts >= maxLoginAttempts;
        if (locked) {
            user.setLockedUntil(now.plusMinutes(lockMinutes));
            attempts = 0;
        }
        user.setFailedLoginAttempts(attempts);
        return locked;
    }

    /** Lấy user theo email và đảm bảo user đang ở trạng thái chờ xác thực. Dùng chung cho verify và resend. */
    private User findPendingUser(String email) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản đăng ký với email này."));
        if (user.getStatus() != User.Status.PENDING_OTP) {
            throw AppException.badRequest("Tài khoản này đã được xác thực. Vui lòng đăng nhập.");
        }
        return user;
    }
}
