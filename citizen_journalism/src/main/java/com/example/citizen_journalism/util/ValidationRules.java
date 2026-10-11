package com.example.citizen_journalism.util;

/** Các quy tắc kiểm tra dữ liệu dùng lại ở nhiều DTO (đăng ký, đổi mật khẩu, cập nhật hồ sơ...). */
public final class ValidationRules {

    public static final String PHONE_REGEX = "^0\\d{9,10}$";
    public static final String PHONE_MESSAGE = "Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0.";

    public static final String PASSWORD_REGEX = "^(?=.*[A-Za-z])(?=.*\\d).+$";
    public static final String PASSWORD_MESSAGE = "Mật khẩu phải có ít nhất một chữ cái và một chữ số.";

    private ValidationRules() {
    }
}
