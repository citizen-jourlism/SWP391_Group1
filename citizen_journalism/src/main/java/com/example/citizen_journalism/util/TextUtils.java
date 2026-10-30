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

    /**
     * Che bớt email để hiển thị cho nhân sự, ví dụ "nguyenvanb@gmail.com" -> "ng***@gmail.com".
     * Giữ tối đa 2 ký tự đầu (tên ngắn quá thì giữ 1). Không phải email (không có @) -> trả nguyên.
     */
    public static String maskEmail(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return email;
        }
        int keep = Math.min(2, Math.max(1, at - 1));
        return email.substring(0, keep) + "***" + email.substring(at);
    }
}
