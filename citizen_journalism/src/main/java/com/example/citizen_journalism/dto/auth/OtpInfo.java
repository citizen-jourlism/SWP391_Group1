package com.example.citizen_journalism.dto.auth;

/**
 * Dữ liệu backend TRẢ VỀ sau khi gửi OTP (đăng ký / gửi lại mã).
 *
 * Frontend dùng để hiển thị ở trang nhập OTP (VerifyOtp.jsx):
 *   - email              : "Mã đã được gửi tới ..."
 *   - expiresInSeconds   : đồng hồ "Mã hết hạn sau 04:59"
 *   - resendAfterSeconds : nút "Gửi lại sau 59s"
 *   - printedToConsole   : true nếu email KHÔNG gửi thật mà chỉ in ra log backend (MAIL_ENABLED=false).
 *                          Khi đó trang OTP hiện gợi ý "xem mã trong log backend".
 *
 * Không bao giờ trả về chính mã OTP (mã chỉ nằm trong email / log backend).
 */
public record OtpInfo(String email, long expiresInSeconds, long resendAfterSeconds, boolean printedToConsole) {
}
