package com.example.citizen_journalism.util;

/**
 * Các quy tắc kiểm tra dữ liệu DÙNG LẠI ở nhiều DTO (đăng ký, đổi mật khẩu, cập nhật hồ sơ, tạo tài khoản...).
 *
 * TẠI SAO gom về 1 chỗ? Nếu sau này muốn đổi quy tắc (ví dụ cho phép SĐT 12 số)
 * thì chỉ sửa ở đây, mọi form tự áp dụng theo. Phía frontend có quy tắc tương ứng
 * trong frontend/src/lib/validators.js, nhớ sửa cả hai cho khớp.
 *
 * Phải là hằng số (static final) vì annotation như @Pattern(regexp = ...) chỉ nhận giá trị hằng.
 */
public final class ValidationRules {

    /** Số điện thoại VN: bắt đầu bằng 0, tổng 10–11 chữ số. ^ và $ = khớp từ đầu đến cuối chuỗi. */
    public static final String PHONE_REGEX = "^0\\d{9,10}$";
    public static final String PHONE_MESSAGE = "Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0.";

    /**
     * Số căn cước công dân (CCCD): đúng 12 chữ số.
     * Frontend có quy tắc tương ứng CITIZEN_ID_LENGTH trong src/lib/validators.js.
     */
    public static final String CITIZEN_ID_REGEX = "^\\d{12}$";
    public static final String CITIZEN_ID_MESSAGE = "Số CCCD gồm đúng 12 chữ số.";

    /**
     * Giấy tờ tuỳ thân trên form gửi tin / khiếu nại (SRS 4.1.1): CMND cũ 9 số HOẶC CCCD 12 số.
     * Khác CITIZEN_ID_REGEX ở trên (hồ sơ tài khoản chỉ nhận CCCD 12 số).
     */
    public static final String PERSONAL_ID_REGEX = "^(\\d{9}|\\d{12})$";
    public static final String PERSONAL_ID_MESSAGE = "CMND/CCCD gồm 9 hoặc 12 chữ số.";

    /** Mật khẩu phải có ít nhất 1 chữ cái VÀ 1 chữ số. (?=...) là "điều kiện nhìn trước" của regex. */
    public static final String PASSWORD_REGEX = "^(?=.*[A-Za-z])(?=.*\\d).+$";
    public static final String PASSWORD_MESSAGE = "Mật khẩu phải có ít nhất một chữ cái và một chữ số.";

    // Constructor private: lớp chỉ chứa hằng số, không cho tạo đối tượng.
    private ValidationRules() {
    }
}
