
package com.example.citizen_journalism.dto.deputy;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * TungTT - Dữ liệu xét duyệt đơn đăng ký Cộng tác viên
 * của Phó Tổng Biên tập.
 *
 * APPROVE: Phê duyệt đơn, nâng cấp tài khoản thành CONTRIBUTOR.
 * REJECT: Từ chối đơn, bắt buộc cung cấp phản hồi chi tiết
 * để người dân biết cần bổ sung và cải thiện những gì.
 */
public record DeputyReviewApplicationRequest(

        // Quyết định xét duyệt: APPROVE hoặc REJECT.
        @NotNull(message = "Vui lòng chọn quyết định xét duyệt.")
        Decision decision,

        // Ghi chú khi phê duyệt, không bắt buộc.
        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự.")
        String note,

        // Lý do từ chối đơn đăng ký.
        @Size(max = 200, message = "Lý do từ chối tối đa 200 ký tự.")
        String rejectionReason,

        // Những thông tin hoặc giấy tờ người dân còn thiếu.
        @Size(max = 200, message = "Thông tin còn thiếu tối đa 200 ký tự.")
        String missingInformation,

        // Hướng dẫn người dân bổ sung và hoàn thiện hồ sơ.
        @Size(max = 200, message = "Yêu cầu cải thiện tối đa 200 ký tự.")
        String improvementRequest
) {

    public enum Decision {
        APPROVE,
        REJECT
    }
}
