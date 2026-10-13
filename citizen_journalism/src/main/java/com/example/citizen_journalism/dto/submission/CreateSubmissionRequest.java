package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.ReporterRelationship;
import com.example.citizen_journalism.util.ValidationRules;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * Dữ liệu chữ của FORM GỬI TIN / KHIẾU NẠI (SRS mục 4.1.1). Các TỆP tư liệu gửi riêng ở phần "files"
 * của request multipart (xem SubmissionController).
 *
 * Quy tắc trong annotation khớp với frontend (src/routes/SubmitReport.jsx), sửa bên này nhớ sửa bên kia.
 * Riêng quy tắc "Họ tên / SĐT / Email bắt buộc KHI KHÔNG ẩn danh" phụ thuộc ô khác nên kiểm tra trong
 * SubmissionService.validateContact().
 *
 * Chú ý @Size, @Email, @Pattern bỏ qua giá trị null -> ô không bắt buộc để trống (null) vẫn hợp lệ.
 */
public record CreateSubmissionRequest(
        @NotNull(message = "Vui lòng chọn loại phản ánh.")
        ReportCategory category,

        @NotBlank(message = "Vui lòng nhập tiêu đề.")
        @Size(min = 10, max = 200, message = "Tiêu đề dài từ 10 đến 200 ký tự.")
        String title,

        @NotBlank(message = "Vui lòng nhập tóm tắt sự việc.")
        @Size(max = 300, message = "Tóm tắt tối đa 300 ký tự.")
        String summary,

        @NotBlank(message = "Vui lòng mô tả chi tiết sự việc.")
        @Size(min = 50, max = 5000, message = "Nội dung chi tiết dài từ 50 đến 5000 ký tự.")
        String content,

        // PastOrPresent: không được sau thời điểm hiện tại của máy chủ
        @NotNull(message = "Vui lòng chọn thời điểm xảy ra sự việc.")
        @PastOrPresent(message = "Thời điểm xảy ra không được ở tương lai.")
        LocalDateTime incidentAt,

        @NotBlank(message = "Vui lòng chọn tỉnh/thành phố.")
        String province,

        @NotBlank(message = "Vui lòng nhập địa chỉ.")
        @Size(max = 250, message = "Địa chỉ tối đa 250 ký tự.")
        String address,

        /** true = gửi ẩn danh: không lưu thông tin liên hệ bên dưới. */
        boolean anonymous,

        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự.")
        String fullName,

        @Pattern(regexp = ValidationRules.PHONE_REGEX, message = ValidationRules.PHONE_MESSAGE)
        String phone,

        @Email(message = "Email không đúng định dạng.")
        @Size(max = 255, message = "Email quá dài.")
        String email,

        @Pattern(regexp = ValidationRules.PERSONAL_ID_REGEX, message = ValidationRules.PERSONAL_ID_MESSAGE)
        String citizenId,

        /** Không bắt buộc. */
        ReporterRelationship relationship,

        // AssertTrue: bắt buộc tick "Tôi cam kết..." (Luật Báo chí)
        @AssertTrue(message = "Bạn cần xác nhận cam kết trước khi gửi.")
        boolean policyAgreed
) {
}
