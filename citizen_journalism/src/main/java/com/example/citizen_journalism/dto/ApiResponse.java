package com.example.citizen_journalism.dto;

import java.util.Map;

/**
 * "Phong bì" chung bọc MỌI dữ liệu backend trả về cho frontend.
 *
 * Ví dụ thành công: { "success": true,  "message": "Đăng nhập thành công!", "code": null, "data": {...}, "errors": null }
 * Ví dụ thất bại:   { "success": false, "message": "Dữ liệu chưa hợp lệ", "code": null, "data": null,
 *                     "errors": { "email": "Email không đúng định dạng." } }
 *
 * - message: câu thông báo cho NGƯỜI DÙNG đọc (tiếng Việt).
 * - code   : mã lỗi cho MÁY đọc (ví dụ "ACCOUNT_NOT_VERIFIED"). Frontend dựa vào code để xử lý riêng
 *            (ví dụ hiện nút "Xác thực email ngay") thay vì so sánh câu chữ (câu chữ có thể đổi bất cứ lúc nào).
 *            Phần lớn lỗi không cần code -> null.
 * - errors : lỗi theo từng ô nhập.
 *
 * TẠI SAO? Mọi API cùng một định dạng thì frontend chỉ cần viết 1 chỗ xử lý (src/lib/api.js).
 *
 * "record" (Java 16+): lớp chỉ chứa dữ liệu, Java tự sinh constructor, getter, equals, toString.
 * <T> là kiểu của data, ví dụ ApiResponse<OtpInfo> thì data là OtpInfo.
 */
public record ApiResponse<T>(boolean success, String message, String code, T data, Map<String, String> errors) {

    /** Thành công, có kèm dữ liệu. */
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, null, data, null);
    }

    /** Thành công, không cần trả dữ liệu (ví dụ: xác thực OTP xong). */
    public static ApiResponse<Void> ok(String message) {
        return ok(message, null);
    }

    /** Thất bại. code và errors có thể null. Chỉ GlobalExceptionHandler và RestAuthenticationHandler dùng. */
    public static ApiResponse<Void> error(String message, String code, Map<String, String> errors) {
        return new ApiResponse<>(false, message, code, null, errors);
    }
}
