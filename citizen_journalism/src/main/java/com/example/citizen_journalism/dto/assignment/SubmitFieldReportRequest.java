package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.entity.FieldReport;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cộng tác viên NỘP BÁO CÁO HIỆN TRƯỜNG: POST /api/contributor/tasks/{id}/report (phần "data" của multipart).
 * Tệp tư liệu nằm ở phần "files", kiểm tra trong FieldReportService.
 *
 * @param title   tiêu đề bài viết nháp
 * @param content nội dung bài viết nháp
 */
public record SubmitFieldReportRequest(
        @NotNull(message = "Vui lòng chọn kết luận xác minh.")
        FieldReport.Conclusion conclusion,

        @NotBlank(message = "Vui lòng nhập kết quả tại hiện trường.")
        @Size(min = 20, max = 2000, message = "Kết quả tại hiện trường từ 20 đến 2000 ký tự.")
        String findings,

        @NotBlank(message = "Vui lòng nhập lời nhân chứng.")
        @Size(max = 2000, message = "Lời nhân chứng tối đa 2000 ký tự.")
        String witnessStatements,

        @NotNull(message = "Vui lòng chọn đề xuất.")
        FieldReport.Recommendation recommendation,

        @NotBlank(message = "Vui lòng nhập tiêu đề bài viết.")
        @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự.")
        String title,

        @NotBlank(message = "Vui lòng nhập nội dung bài viết.")
        @Size(min = 50, max = 50000, message = "Nội dung bài viết từ 50 đến 50000 ký tự.")
        String content
) {
}
