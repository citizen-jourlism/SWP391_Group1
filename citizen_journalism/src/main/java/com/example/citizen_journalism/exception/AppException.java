package com.example.citizen_journalism.exception;

import java.util.Map;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ CÓ CHỦ ĐÍCH: tình huống mình đã lường trước và muốn báo cho người dùng,
 * ví dụ email đã tồn tại, OTP sai, sai mật khẩu, tài khoản bị khoá...
 *
 * CÁCH DÙNG trong service:
 *   throw AppException.conflict("Email này đã được đăng ký.");
 *   throw AppException.forbidden("Tài khoản chưa xác thực email.", ErrorCode.ACCOUNT_NOT_VERIFIED); // kèm mã lỗi
 * Sau đó GlobalExceptionHandler sẽ bắt và trả về JSON với đúng mã HTTP + thông báo (+ mã lỗi nếu có).
 *
 * TẠI SAO không trả lỗi trực tiếp trong service? Service không cần biết gì về HTTP,
 * chỉ việc "ném" lỗi. Toàn bộ việc định dạng phản hồi lỗi nằm ở 1 chỗ duy nhất.
 */
@Getter
public class AppException extends RuntimeException {

    /** Mã HTTP trả về cho frontend (400, 401, 403, 404, 409, 429...). */
    private final HttpStatus status;

    /** Mã lỗi cho frontend xử lý riêng (xem ErrorCode). Có thể null. */
    private final String code;

    /** Lỗi theo từng ô nhập { tênÔ: thôngBáo } (giống lỗi @Valid), để frontend hiện ngay dưới ô. Có thể null. */
    private final Map<String, String> errors;

    public AppException(HttpStatus status, String message) {
        this(status, message, null);
    }

    public AppException(HttpStatus status, String message, String code) {
        this(status, message, code, null);
    }

    private AppException(HttpStatus status, String message, String code, Map<String, String> errors) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    /**
     * 400 kèm lỗi theo từng ô. Dùng cho các quy tắc annotation không diễn tả được,
     * ví dụ "Họ tên bắt buộc KHI KHÔNG gửi ẩn danh" (xem SubmissionService).
     */
    public static AppException invalidFields(Map<String, String> errors) {
        return new AppException(HttpStatus.BAD_REQUEST, "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.", null, errors);
    }

    // Các hàm tạo nhanh cho những mã lỗi hay dùng, giúp code service ngắn và dễ đọc.

    /** 400: dữ liệu/yêu cầu không hợp lệ (ví dụ OTP sai). */
    public static AppException badRequest(String message) {
        return new AppException(HttpStatus.BAD_REQUEST, message);
    }

    /** 401: chưa đăng nhập / sai thông tin đăng nhập / phiên đăng nhập hết hạn. */
    public static AppException unauthorized(String message) {
        return new AppException(HttpStatus.UNAUTHORIZED, message);
    }

    /** 403: đã biết là ai nhưng KHÔNG được phép (ví dụ tài khoản bị khoá, chưa xác thực). */
    public static AppException forbidden(String message, String code) {
        return new AppException(HttpStatus.FORBIDDEN, message, code);
    }

    /** 404: không tìm thấy (ví dụ email chưa đăng ký). */
    public static AppException notFound(String message) {
        return new AppException(HttpStatus.NOT_FOUND, message);
    }

    /** 409: xung đột dữ liệu (ví dụ email đã có người dùng). */
    public static AppException conflict(String message) {
        return new AppException(HttpStatus.CONFLICT, message);
    }

    /** 429: gửi yêu cầu quá nhanh/quá nhiều (ví dụ bấm gửi lại OTP liên tục, đoán mật khẩu). */
    public static AppException tooManyRequests(String message) {
        return new AppException(HttpStatus.TOO_MANY_REQUESTS, message);
    }
}
