package com.example.citizen_journalism.dto.submission;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Người gửi BỔ SUNG THÔNG TIN cho hồ sơ đang "Cần bổ sung": POST
 * /api/submissions/mine/{code}/supplement
 * (UC "Provide Additional Information" của Người dân và Chuyên gia). Phần chữ
 * của request multipart ("data");
 * các tệp bổ sung gửi riêng ở phần "files" (xem SubmissionController).
 * Frontend: components/submission/SupplementForm.jsx.
 *
 * Các ô đều không bắt buộc, nhưng phải có ÍT NHẤT một thứ (thông tin, câu trả
 * lời, địa chỉ mới, nguồn hoặc tệp):
 * kiểm tra trong SubmissionSupplementService.
 *
 * Giới hạn thông tin bổ sung theo vai trò (kiểm tra trong service): Người dân /
 * CTV 2000 ký tự, Chuyên gia 4000
 * (tính tổng các câu trả lời nếu trả lời theo từng mục). @Size ở đây chỉ chặn
 * mức cao nhất.
 *
 * @param additionalInfo thông tin bổ sung (một ô chung)
 * @param answers        Chuyên gia trả lời TỪNG mục của lời nhắn ("1. ...", "2.
 *                       ..."), đúng thứ tự, mỗi mục 1 phần tử.
 *                       Backend tự ghép thành "Mục 1: ...\n\nMục 2: ...". Gửi
 *                       answers thì không gửi additionalInfo.
 * @param address        địa chỉ chính xác của sự việc (Người dân). Khác địa chỉ
 *                       cũ thì cập nhật vào hồ sơ
 * @param sources        nguồn tham khảo bổ sung (Chuyên gia): tên nguồn + đường
 *                       dẫn / DOI
 */
public record SupplementSubmissionRequest(
                @Size(max = 4000, message = "Thông tin bổ sung tối đa 4000 ký tự.") String additionalInfo,

                @Size(max = 20, message = "Quá nhiều câu trả lời.") List<String> answers,

                @Size(max = 250, message = "Địa chỉ tối đa 250 ký tự.") String address,

                @Valid @Size(max = 10, message = "Tối đa 10 nguồn tham khảo.") List<SourceRef> sources) {

        /** Một nguồn tham khảo. url không bắt buộc (ví dụ sách in, báo cáo nội bộ). */
        public record SourceRef(
                        @NotBlank(message = "Vui lòng nhập tên nguồn.") @Size(max = 250, message = "Tên nguồn tối đa 250 ký tự.") String title,

                        @Size(max = 500, message = "Đường dẫn tối đa 500 ký tự.") String url) {
        }
}
