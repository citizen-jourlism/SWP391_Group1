package com.example.citizen_journalism.dto;

import java.util.Map;

/**
 * Định dạng trả về chung cho mọi API: { success, message, data, errors }.
 * - data: dữ liệu khi thành công
 * - errors: lỗi theo từng trường (field -> message) khi dữ liệu gửi lên không hợp lệ
 */
public record ApiResponse<T>(boolean success, String message, T data, Map<String, String> errors) {

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static ApiResponse<Void> ok(String message) {
        return ok(message, null);
    }

    public static ApiResponse<Void> error(String message, Map<String, String> errors) {
        return new ApiResponse<>(false, message, null, errors);
    }
}
