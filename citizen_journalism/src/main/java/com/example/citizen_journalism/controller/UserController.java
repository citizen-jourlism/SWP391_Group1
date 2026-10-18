package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.auth.EmailRequest;
import com.example.citizen_journalism.dto.auth.OtpInfo;
import com.example.citizen_journalism.dto.user.OtpCodeRequest;
import com.example.citizen_journalism.dto.user.UpdateProfileRequest;
import com.example.citizen_journalism.dto.user.UserProfile;
import com.example.citizen_journalism.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API HỒ SƠ CÁ NHÂN của người đang đăng nhập. Tất cả đều BẮT BUỘC có token (luật "/api/**" trong SecurityConfig).
 *
 * "/me" = chính tôi: mã người dùng lấy từ token (jwt.getSubject()), KHÔNG nhận id từ đường dẫn
 * -> không ai sửa được hồ sơ của người khác bằng cách đổi id trên URL.
 *
 *   GET    /api/users/me                -> xem hồ sơ
 *   PUT    /api/users/me                -> sửa họ tên, SĐT, CCCD, địa chỉ, ngày sinh
 *   POST   /api/users/me/email          -> đổi email bước 1: gửi OTP tới email mới
 *   POST   /api/users/me/email/verify   -> đổi email bước 2: nhập OTP
 *   POST   /api/users/me/avatar         -> tải ảnh đại diện (multipart/form-data, trường "file")
 *   DELETE /api/users/me/avatar         -> xoá ảnh đại diện
 */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ApiResponse<UserProfile> getProfile(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("OK", userService.getProfile(jwt.getSubject()));
    }

    @PutMapping
    public ApiResponse<UserProfile> updateProfile(@AuthenticationPrincipal Jwt jwt,
                                                  @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok("Đã lưu thông tin cá nhân.", userService.updateProfile(jwt.getSubject(), request));
    }

    @PostMapping("/email")
    public ApiResponse<OtpInfo> requestEmailChange(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestBody EmailRequest request) {
        return ApiResponse.ok("Mã xác nhận đã được gửi tới email mới.",
                userService.requestEmailChange(jwt.getSubject(), request.email()));
    }

    @PostMapping("/email/verify")
    public ApiResponse<UserProfile> verifyEmailChange(@AuthenticationPrincipal Jwt jwt,
                                                      @Valid @RequestBody OtpCodeRequest request) {
        return ApiResponse.ok("Đổi email thành công!", userService.verifyEmailChange(jwt.getSubject(), request.otp()));
    }

    /**
     * consumes = MULTIPART_FORM_DATA: request gửi FILE (không phải JSON).
     * @RequestParam("file"): lấy file trong trường tên "file" của form (frontend gửi bằng FormData).
     */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserProfile> updateAvatar(@AuthenticationPrincipal Jwt jwt,
                                                 @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Đã cập nhật ảnh đại diện.", userService.updateAvatar(jwt.getSubject(), file));
    }

    @DeleteMapping("/avatar")
    public ApiResponse<UserProfile> removeAvatar(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("Đã xoá ảnh đại diện.", userService.removeAvatar(jwt.getSubject()));
    }
}
