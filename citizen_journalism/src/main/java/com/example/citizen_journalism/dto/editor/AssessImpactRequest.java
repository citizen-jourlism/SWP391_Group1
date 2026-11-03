package com.example.citizen_journalism.dto.editor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Biên tập viên ĐÁNH GIÁ MỨC TÁC ĐỘNG của hồ sơ: POST /api/editor/submissions/{mã}/impact
 * BTV chỉ tick 1 lựa chọn cho mỗi tiêu chí; hệ thống tự tính điểm và xếp mức (ImpactScoreService).
 * Giới hạn khớp với frontend (lib/impactScore.js -> IMPACT_LIMITS).
 *
 * @param area            A. Khu vực ảnh hưởng
 * @param people          B. Số người bị ảnh hưởng
 * @param nature          C. Tính chất vấn đề
 * @param sensitive       true = nội dung nhạy cảm (nêu đích danh cơ quan / cán bộ, rủi ro pháp lý) -> tối thiểu mức HIGH
 * @param sensitiveReason lý do nhạy cảm; bắt buộc 10 - 300 ký tự khi sensitive = true
 * @param note            ghi chú nội bộ (không bắt buộc, tối đa 500 ký tự), người gửi không thấy
 */
public record AssessImpactRequest(
        @NotNull(message = "Vui lòng chọn khu vực ảnh hưởng.")
        Area area,
        @NotNull(message = "Vui lòng chọn số người bị ảnh hưởng.")
        People people,
        @NotNull(message = "Vui lòng chọn tính chất vấn đề.")
        Nature nature,
        boolean sensitive,
        @Size(max = 300, message = "Lý do nhạy cảm tối đa 300 ký tự.")
        String sensitiveReason,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note) {

    /** A. Khu vực ảnh hưởng (điểm: 5 / 10 / 20 / 30). */
    public enum Area {
        SPOT(5),        // Một hộ, một điểm cụ thể
        WARD(10),       // Một phường / xã, khu dân cư
        DISTRICT(20),   // Nhiều phường / xã, cả quận / huyện
        PROVINCE(30);   // Toàn tỉnh / thành hoặc liên tỉnh

        public final int points;

        Area(int points) {
            this.points = points;
        }
    }

    /** B. Số người bị ảnh hưởng (điểm: 5 / 10 / 20 / 30). */
    public enum People {
        UNDER_10(5),        // Dưới 10 người
        UP_TO_100(10),      // 10 - 100 người
        UP_TO_1000(20),     // 101 - 1.000 người
        OVER_1000(30);      // Trên 1.000 người

        public final int points;

        People(int points) {
            this.points = points;
        }
    }

    /** C. Tính chất vấn đề (điểm: 5 / 15 / 25 / 40). */
    public enum Nature {
        NUISANCE(5),        // Phiền toái, dịch vụ công
        RIGHTS(15),         // Quyền lợi, tài sản, kinh tế
        SAFETY(25),         // Sức khoẻ, môi trường, an toàn công cộng
        LIFE_THREAT(40);    // Đe doạ tính mạng, thiên tai, thảm hoạ

        public final int points;

        Nature(int points) {
            this.points = points;
        }
    }
}
