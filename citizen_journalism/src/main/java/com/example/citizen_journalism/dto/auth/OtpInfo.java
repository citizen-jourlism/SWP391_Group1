package com.example.citizen_journalism.dto.auth;

/** Thông tin trả về sau khi gửi OTP, để frontend hiện đồng hồ đếm ngược. */
public record OtpInfo(String email, long expiresInSeconds, long resendAfterSeconds) {
}
