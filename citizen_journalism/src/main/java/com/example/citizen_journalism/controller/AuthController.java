package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.auth.EmailRequest;
import com.example.citizen_journalism.dto.auth.OtpInfo;
import com.example.citizen_journalism.dto.auth.RegisterRequest;
import com.example.citizen_journalism.dto.auth.VerifyOtpRequest;
import com.example.citizen_journalism.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * CONTROLLER = "quầy tiếp dân" của backend: nơi nhận HTTP request từ frontend.
 *
 * LUỒNG CHẠY của một request đăng ký:
 *   Frontend (Register.jsx) --POST /api/auth/register--> AuthController.register()
 *     -> @Valid kiểm tra dữ liệu theo RegisterRequest (sai thì GlobalExceptionHandler trả lỗi 400)
 *     -> AuthService.register() xử lý nghiệp vụ
 *     -> UserRepository / OtpService lưu vào MySQL và gửi OTP
 *   <-- trả về JSON dạng ApiResponse { success, message, data }
 *
 * TẠI SAO controller "mỏng" (chỉ gọi service)?
 *   Controller chỉ lo nhận/trả HTTP. Toàn bộ logic nằm ở Service để dễ đọc, dễ test
 *   và dùng lại được (ví dụ: sau này admin tạo tài khoản cũng có thể gọi lại service).
 *
 * Các API ở đây là công khai (chưa cần đăng nhập) vì người dùng chưa có tài khoản.
 */
@RestController                 // Lớp này trả dữ liệu JSON (không trả trang HTML)
@RequestMapping("/api/auth")    // Tiền tố chung cho mọi đường dẫn bên dưới
@RequiredArgsConstructor        // Lombok tự tạo constructor để Spring "tiêm" (inject) AuthService vào
public class AuthController {

    private final AuthService authService;

    /**
     * Bước 1 - Đăng ký: POST /api/auth/register
     * Body: { fullName, email, phone, password }
     * Trả về 201 + OtpInfo (email, số giây mã còn hiệu lực, số giây phải chờ để gửi lại)
     * để frontend hiển thị đồng hồ đếm ngược ở trang nhập OTP.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED) // 201 Created: đã tạo mới tài nguyên (tài khoản)
    public ApiResponse<OtpInfo> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok("Đăng ký thành công! Mã OTP đã được gửi tới email của bạn.", authService.register(request));
    }

    /**
     * Bước 2 - Xác thực OTP: POST /api/auth/verify-otp
     * Body: { email, otp }. Đúng mã thì tài khoản chuyển từ PENDING_OTP sang ACTIVE.
     */
    @PostMapping("/verify-otp")
    public ApiResponse<Void> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyRegistration(request);
        return ApiResponse.ok("Xác thực tài khoản thành công!");
    }

    /**
     * Gửi lại mã OTP: POST /api/auth/resend-otp
     * Body: { email }. Dùng khi mã hết hạn hoặc người dùng không nhận được email.
     */
    @PostMapping("/resend-otp")
    public ApiResponse<OtpInfo> resendOtp(@Valid @RequestBody EmailRequest request) {
        return ApiResponse.ok("Đã gửi lại mã OTP.", authService.resendRegistrationOtp(request.email()));
    }
}
