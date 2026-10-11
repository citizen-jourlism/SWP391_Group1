package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.auth.OtpInfo;
import com.example.citizen_journalism.dto.auth.RegisterRequest;
import com.example.citizen_journalism.dto.auth.VerifyOtpRequest;
import com.example.citizen_journalism.entity.OtpToken;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.UserIdGenerator;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * SERVICE = "bộ não" xử lý nghiệp vụ tài khoản (đăng ký, xác thực...).
 *
 * VỊ TRÍ: được AuthController gọi; bản thân nó gọi xuống
 *   - UserRepository   : đọc/ghi bảng users
 *   - OtpService       : sinh/gửi/kiểm tra mã OTP
 *   - PasswordEncoder  : mã hoá mật khẩu (BCrypt)
 *   - UserIdGenerator  : sinh mã người dùng (CT0001...)
 *
 * Sau này Đăng nhập, Quên mật khẩu, Đổi mật khẩu cũng sẽ được thêm vào đây.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserIdGenerator userIdGenerator;
    private final OtpService otpService;

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

    /** Lấy user theo email và đảm bảo user đang ở trạng thái chờ xác thực. Dùng chung cho verify và resend. */
    private User findPendingUser(String email) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản đăng ký với email này."));
        if (user.getStatus() != User.Status.PENDING_OTP) {
            throw AppException.badRequest("Tài khoản này đã được xác thực. Vui lòng đăng nhập.");
        }
        return user;
    }

    /**
     * Chuẩn hoá email: bỏ khoảng trắng, chuyển chữ thường.
     * Tại sao? "An@Gmail.com" và "an@gmail.com" là cùng một hộp thư -> tránh tạo 2 tài khoản trùng.
     */
    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
