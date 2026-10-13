package com.example.citizen_journalism.dto.submission;

import java.util.List;

/**
 * Các tuỳ chọn / giới hạn của form gửi tin, khiếu nại mà frontend cần biết (GET /api/submissions/options).
 *
 * TẠI SAO lấy từ backend? Danh sách tỉnh và giới hạn tệp chỉ khai báo 1 lần ở backend (nơi kiểm tra thật),
 * frontend đọc về để hiển thị và kiểm tra trước -> không có chuyện 2 bên lệch nhau.
 *
 * @param provinces       danh sách tỉnh/thành (util/VietnamProvinces)
 * @param maxFiles        số tệp tối đa mỗi lần gửi
 * @param maxFileSizeMb   dung lượng tối đa MỖI tệp (MB)
 * @param maxTotalSizeMb  tổng dung lượng tối đa của 1 lần gửi (MB, = spring.servlet.multipart.max-request-size)
 * @param acceptedTypes   các Content-Type được nhận (gắn vào thuộc tính accept của ô chọn tệp)
 */
public record SubmissionFormOptions(
        List<String> provinces,
        int maxFiles,
        long maxFileSizeMb,
        long maxTotalSizeMb,
        List<String> acceptedTypes) {
}
