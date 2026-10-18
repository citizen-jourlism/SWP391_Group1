package com.example.citizen_journalism.util;

import java.util.Locale;

/** Các hàm xử lý chuỗi nhỏ, dùng lại ở nhiều service (AuthService, UserService...). */
public final class TextUtils {

    private TextUtils() {
    }

    /**
     * Chuẩn hoá email: bỏ khoảng trắng, chuyển chữ thường.
     * Tại sao? "An@Gmail.com" và "an@gmail.com" là cùng một hộp thư -> tránh tạo 2 tài khoản trùng.
     */
    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Chuỗi null / rỗng / toàn dấu cách -> null; còn lại thì bỏ khoảng trắng 2 đầu. Để DB lưu NULL thay vì "". */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
