package com.example.citizen_journalism.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ CÓ CHỦ ĐÍCH: tình huống mình đã lường trước và muốn báo cho người dùng,
 * ví dụ email đã tồn tại, OTP sai, không tìm thấy tài khoản...
 *
 * CÁCH DÙNG trong service:  throw AppException.conflict("Email này đã được đăng ký.");
 * Sau đó GlobalExceptionHandler sẽ bắt và trả về JSON với đúng mã HTTP + thông báo.
 *
 * TẠI SAO không trả lỗi trực tiếp trong service? Service không cần biết gì về HTTP,
 * chỉ việc "ném" lỗi. Toàn bộ việc định dạng phản hồi lỗi nằm ở 1 chỗ duy nhất.
 */
@Getter
public class AppException extends RuntimeException {

    /** Mã HTTP trả về cho frontend (400, 404, 409, 429...). */
    private final HttpStatus status;

    public AppException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    // Các hàm tạo nhanh cho những mã lỗi hay dùng, giúp code service ngắn và dễ đọc.

    /** 400: dữ liệu/yêu cầu không hợp lệ (ví dụ OTP sai). */
    public static AppException badRequest(String message) {
        return new AppException(HttpStatus.BAD_REQUEST, message);
    }

    /** 404: không tìm thấy (ví dụ email chưa đăng ký). */
    public static AppException notFound(String message) {
        return new AppException(HttpStatus.NOT_FOUND, message);
    }

    /** 409: xung đột dữ liệu (ví dụ email đã có người dùng). */
    public static AppException conflict(String message) {
        return new AppException(HttpStatus.CONFLICT, message);
    }

    /** 429: gửi yêu cầu quá nhanh/quá nhiều (ví dụ bấm gửi lại OTP liên tục). */
    public static AppException tooManyRequests(String message) {
        return new AppException(HttpStatus.TOO_MANY_REQUESTS, message);
    }
}
