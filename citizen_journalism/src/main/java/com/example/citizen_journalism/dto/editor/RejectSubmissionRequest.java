package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Biên tập viên TỪ CHỐI hồ sơ: POST /api/editor/submissions/{mã}/reject
 *
 * @param reason       lý do (bắt buộc)
 * @param feedback     phản hồi GỬI NGƯỜI GỬI, hiện ở trang theo dõi hồ sơ + email (bắt buộc, 20 - 1000 ký tự)
 * @param internalNote ghi chú NỘI BỘ toà soạn, người gửi không thấy (không bắt buộc)
 * @param applyPenalty trừ điểm uy tín người gửi. Chỉ có tác dụng khi lý do là SPAM và hồ sơ không ẩn danh.
 */
public record RejectSubmissionRequest(
        @NotNull(message = "Vui lòng chọn lý do từ chối.")
        RejectReason reason,

        @NotBlank(message = "Vui lòng nhập phản hồi gửi người gửi.")
        @Size(min = 20, max = 1000, message = "Phản hồi cần từ 20 đến 1000 ký tự.")
        String feedback,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String internalNote,

        boolean applyPenalty) {
}
