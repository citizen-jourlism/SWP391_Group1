package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Biên tập viên YÊU CẦU BỔ SUNG THÔNG TIN: POST /api/editor/submissions/{mã}/request-info
 * Giới hạn khớp với frontend (lib/requestInfo.js -> REQUEST_INFO_LIMITS).
 *
 * @param message      lời nhắn mở đầu gửi người gửi (không bắt buộc, tối đa 1000 ký tự)
 * @param items        các mục cần bổ sung, mỗi mục 10 - 300 ký tự (bắt buộc 1 - 5 mục)
 * @param internalNote ghi chú NỘI BỘ toà soạn, người gửi không thấy (không bắt buộc, tối đa 500 ký tự)
 */
public record RequestInfoRequest(
        @Size(max = 1000, message = "Lời nhắn tối đa 1000 ký tự.")
        String message,

        @NotEmpty(message = "Vui lòng thêm ít nhất 1 mục cần bổ sung.")
        @Size(max = 5, message = "Tối đa 5 mục.")
        List<@NotBlank(message = "Mục cần bổ sung không được để trống.")
             @Size(min = 10, max = 300, message = "Mỗi mục cần từ 10 đến 300 ký tự.") String> items,

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String internalNote) {
}
