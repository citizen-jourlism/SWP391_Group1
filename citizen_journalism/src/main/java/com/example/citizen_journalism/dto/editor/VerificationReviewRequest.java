package com.example.citizen_journalism.dto.editor;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Biên tập viên DUYỆT KẾT QUẢ XÁC MINH và chuyển Phó Tổng biên tập:
 * POST /api/editor/submissions/{mã}/verification-review
 * Giới hạn khớp với frontend (lib/verificationReview.js -> VERIFICATION_REVIEW_LIMITS).
 *
 * @param checks kết quả đủ 5 tiêu chí (mỗi tiêu chí 1 lần). Chỉ chuyển được khi tất cả đều Đạt,
 *               tiêu chí Chưa đạt thì Biên tập viên chuyển sang Yêu cầu bổ sung hoặc Từ chối.
 * @param note   ghi chú NỘI BỘ gửi Phó Tổng biên tập, người gửi không thấy. Không bắt buộc, tối đa 1000 ký tự.
 */
public record VerificationReviewRequest(
        @NotNull(message = "Vui lòng đánh giá đủ các tiêu chí.")
        @Size(min = 5, max = 5, message = "Vui lòng đánh giá đủ 5 tiêu chí.")
        List<@Valid Check> checks,

        @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự.")
        String note) {

    /**
     * Kết quả 1 tiêu chí.
     *
     * @param criterion tiêu chí
     * @param passed    true = Đạt, false = Chưa đạt
     * @param issue     vấn đề cần xử lý (chỉ có khi Chưa đạt), tối đa 300 ký tự
     */
    public record Check(
            @NotNull(message = "Thiếu tên tiêu chí.")
            Criterion criterion,

            @NotNull(message = "Vui lòng chọn Đạt hoặc Chưa đạt.")
            Boolean passed,

            @Size(max = 300, message = "Mỗi vấn đề tối đa 300 ký tự.")
            String issue) {
    }

    /** 5 tiêu chí duyệt kết quả xác minh, label là tên hiển thị (ghi vào editorial_reviews.comments). */
    @Getter
    @RequiredArgsConstructor
    public enum Criterion {
        CONTENT("Tiêu đề & nội dung bài CTV"),
        ORIGIN("Khớp với tin gốc"),
        FIELD_EVIDENCE("Bằng chứng thực địa"),
        SCREENING("Kết quả sàng lọc"),
        LEGAL("Pháp lý & quyền riêng tư");

        private final String label;
    }
}
