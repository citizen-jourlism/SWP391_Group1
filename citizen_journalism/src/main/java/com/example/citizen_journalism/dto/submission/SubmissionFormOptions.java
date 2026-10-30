package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Evidence.FileType;
import com.example.citizen_journalism.entity.Submission.ReportCategory;
import java.util.List;
import java.util.Map;

/**
 * Các tuỳ chọn / giới hạn của form gửi tin, khiếu nại mà frontend cần biết (GET /api/submissions/options).
 *
 * TẠI SAO lấy từ backend? Danh sách tỉnh và giới hạn tệp chỉ khai báo 1 lần ở backend (nơi kiểm tra thật),
 * frontend đọc về để hiển thị và kiểm tra trước -> không có chuyện 2 bên lệch nhau.
 *
 * @param categories      các loại phản ánh NGƯỜI ĐANG ĐĂNG NHẬP được chọn (theo vai trò, xem ReportCategory.allowedRoles)
 * @param provinces       danh sách tỉnh/thành (util/VietnamProvinces)
 * @param maxFiles            tổng số tệp tối đa mỗi lần gửi (mọi loại cộng lại)
 * @param maxFilesByType      số tệp tối đa theo loại, ví dụ {"IMAGE":10,"VIDEO":2,...}
 * @param maxFileSizeMbByType dung lượng tối đa MỖI tệp theo loại (MB), ví dụ {"IMAGE":20,"VIDEO":300,...}
 * @param maxTotalSizeMb      tổng dung lượng tối đa của 1 lần gửi (MB, xem SubmissionService.MAX_TOTAL_BYTES)
 * @param acceptedTypes   các Content-Type được nhận (gắn vào thuộc tính accept của ô chọn tệp)
 */
public record SubmissionFormOptions(
        List<ReportCategory> categories,
        List<String> provinces,
        int maxFiles,
        Map<FileType, Integer> maxFilesByType,
        Map<FileType, Long> maxFileSizeMbByType,
        long maxTotalSizeMb,
        List<String> acceptedTypes) {
}
