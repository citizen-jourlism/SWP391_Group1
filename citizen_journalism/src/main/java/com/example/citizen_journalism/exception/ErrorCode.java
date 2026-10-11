package com.example.citizen_journalism.exception;

/**
 * Danh sách MÃ LỖI gửi kèm trong ApiResponse.code để frontend xử lý riêng từng trường hợp.
 *
 * TẠI SAO dùng mã thay vì so sánh câu thông báo? Câu thông báo là để người đọc, có thể sửa chữ bất cứ lúc nào;
 * còn mã lỗi là "hợp đồng" cố định giữa backend và frontend.
 * Frontend dùng các mã này ở: src/routes/Login.jsx, src/lib/api.js.
 */
public final class ErrorCode {

    /** Đăng nhập đúng mật khẩu nhưng tài khoản chưa nhập OTP xác thực email. */
    public static final String ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED";

    /** Tài khoản bị khoá bởi quản trị viên / Ban biên tập (status = LOCKED). */
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";

    /** Chưa đăng nhập, token sai hoặc đã hết hạn. */
    public static final String UNAUTHORIZED = "UNAUTHORIZED";

    /** Đã đăng nhập nhưng vai trò không đủ quyền. */
    public static final String FORBIDDEN = "FORBIDDEN";

    private ErrorCode() {
    }
}
