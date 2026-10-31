package com.example.citizen_journalism.dto.assignment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cộng tác viên SỬA BÀI VIẾT theo yêu cầu của Biên tập viên: PUT /api/contributor/tasks/{id}/report/article
 *
 * @param note lời nhắn gửi Biên tập viên (không bắt buộc)
 */
public record UpdateReportArticleRequest(
        @NotBlank(message = "Vui lòng nhập tiêu đề bài viết.")
        @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự.")
        String title,

        @NotBlank(message = "Vui lòng nhập nội dung bài viết.")
        @Size(min = 50, max = 50000, message = "Nội dung bài viết từ 50 đến 50000 ký tự.")
        String content,

        @Size(max = 1000, message = "Lời nhắn tối đa 1000 ký tự.")
        String note
) {
}
