package com.example.citizen_journalism.dto;

import java.util.Map;

/**
 * "Phong bì" chung bọc MỌI dữ liệu backend trả về cho frontend.
 *
 * Ví dụ thành công: { "success": true,  "message": "Đăng ký thành công!", "data": {...}, "errors": null }
 * Ví dụ thất bại:   { "success": false, "message": "Dữ liệu chưa hợp lệ", "data": null,
 *                     "errors": { "email": "Email không đúng định dạng." } }
 *
 * TẠI SAO? Mọi API cùng một định dạng thì frontend chỉ cần viết 1 chỗ xử lý (src/lib/api.js),
 * không phải đoán mỗi API trả về kiểu gì.
 *
 * "record" (Java 16+): lớp chỉ chứa dữ liệu, Java tự sinh constructor, getter, equals, toString.
 * <T> là kiểu của data, ví dụ ApiResponse<OtpInfo> thì data là OtpInfo.
 */
public record ApiResponse<T>(boolean success, String message, T data, Map<String, String> errors) {

    /** Thành công, có kèm dữ liệu. */
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    /** Thành công, không cần trả dữ liệu (ví dụ: xác thực OTP xong). */
    public static ApiResponse<Void> ok(String message) {
        return ok(message, null);
    }

    /** Thất bại; errors là lỗi theo từng ô nhập (có thể null nếu là lỗi chung). Chỉ GlobalExceptionHandler dùng. */
    public static ApiResponse<Void> error(String message, Map<String, String> errors) {
        return new ApiResponse<>(false, message, null, errors);
    }
}
