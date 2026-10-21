package com.example.citizen_journalism.dto.contributor;

import com.example.citizen_journalism.entity.ContributorApplication.Availability;
import com.example.citizen_journalism.entity.ContributorApplication.Status;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Một ĐƠN ĐĂNG KÝ CTV như người nộp (và Biên tập viên) nhìn thấy: nội dung đơn + kết quả từng bước duyệt.
 * Dùng cho trang theo dõi đơn (Track Contributor Application) và trang xét duyệt của Biên tập viên.
 * Không chứa tên người duyệt (chỉ cần biết bước nào đã xử lý, lúc nào, ghi chú gì).
 *
 * @param documents danh sách giấy tờ (không có đường dẫn trực tiếp: xem qua API có kiểm tra quyền, theo index)
 */
public record ApplicationView(
        Long id,
        Status status,
        List<String> expertiseFields,
        String province,
        String occupation,
        Availability availability,
        String experience,
        List<Document> documents,
        LocalDateTime createdAt,
        String editorNote,
        LocalDateTime editorReviewedAt,
        String deputyNote,
        LocalDateTime deputyReviewedAt,
        LocalDateTime withdrawnAt) {

    /** Thông tin 1 giấy tờ; index = vị trí trong danh sách, dùng để gọi API xem tệp. */
    public record Document(int index, String name, String contentType, long size) {
    }
}
