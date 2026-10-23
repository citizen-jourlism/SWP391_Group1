package com.example.citizen_journalism.util;

import java.util.List;

/**
 * Các LĨNH VỰC người đăng ký Cộng tác viên có thể chọn (lĩnh vực am hiểu / muốn đưa tin).
 * 5 lĩnh vực đầu trùng các chuyên mục của toà soạn (bảng categories), thêm vài lĩnh vực dân sinh hay gặp.
 *
 * Nguồn DUY NHẤT: backend dùng để kiểm tra giá trị gửi lên, frontend nhận danh sách qua
 * GET /api/contributor-applications/me (giống cách làm với VietnamProvinces).
 */
public final class ExpertiseFields {

    public static final List<String> ALL = List.of(
            "Kinh tế",
            "Chính trị - Xã hội",
            "Pháp luật",
            "Đời sống",
            "Khoa học - Môi trường",
            "Giáo dục",
            "Y tế - Sức khoẻ",
            "Giao thông - Đô thị");

    /** Chọn tối đa bao nhiêu lĩnh vực. */
    public static final int MAX_SELECTED = 3;

    private ExpertiseFields() {
    }
}
