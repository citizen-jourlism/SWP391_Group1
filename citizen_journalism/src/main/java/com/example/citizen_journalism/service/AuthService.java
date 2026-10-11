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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserIdGenerator userIdGenerator;
    private final OtpService otpService;

    /**
     * Đăng ký tài khoản Người dân (CITIZEN) ở trạng thái PENDING_OTP rồi gửi OTP.
     * Nếu email đã đăng ký nhưng chưa xác thực, cho phép đăng ký lại (cập nhật thông tin + gửi mã mới).
     */
    @Transactional
    public OtpInfo register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email)
                .map(existing -> {
                    if (existing.getStatus() != User.Status.PENDING_OTP) {
                        throw AppException.conflict("Email này đã được đăng ký. Vui lòng đăng nhập.");
                    }
                    return existing;
                })
                .orElseGet(() -> User.builder()
                        .id(userIdGenerator.next(User.Role.CITIZEN))
                        .role(User.Role.CITIZEN)
                        .status(User.Status.PENDING_OTP)
                        .email(email)
                        .build());

        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        return otpService.issue(user, OtpToken.Purpose.REGISTER);
    }

    /** Nhập đúng OTP thì kích hoạt tài khoản. Không rollback khi sai để vẫn đếm được số lần nhập sai. */
    @Transactional(noRollbackFor = AppException.class)
    public void verifyRegistration(VerifyOtpRequest request) {
        User user = findPendingUser(request.email());
        otpService.verify(user, OtpToken.Purpose.REGISTER, request.otp());
        user.setStatus(User.Status.ACTIVE);
        user.setIsVerified(true);
    }

    @Transactional
    public OtpInfo resendRegistrationOtp(String email) {
        return otpService.issue(findPendingUser(email), OtpToken.Purpose.REGISTER);
    }

    private User findPendingUser(String email) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản đăng ký với email này."));
        if (user.getStatus() != User.Status.PENDING_OTP) {
            throw AppException.badRequest("Tài khoản này đã được xác thực. Vui lòng đăng nhập.");
        }
        return user;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
