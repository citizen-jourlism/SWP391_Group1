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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OtpInfo> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok("Đăng ký thành công! Mã OTP đã được gửi tới email của bạn.", authService.register(request));
    }

    @PostMapping("/verify-otp")
    public ApiResponse<Void> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyRegistration(request);
        return ApiResponse.ok("Xác thực tài khoản thành công!");
    }

    @PostMapping("/resend-otp")
    public ApiResponse<OtpInfo> resendOtp(@Valid @RequestBody EmailRequest request) {
        return ApiResponse.ok("Đã gửi lại mã OTP.", authService.resendRegistrationOtp(request.email()));
    }
}
