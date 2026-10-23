package com.example.citizen_journalism.util;

import java.util.List;

/**
 * DANH SÁCH 34 TỈNH, THÀNH PHỐ của Việt Nam (theo sắp xếp đơn vị hành chính có hiệu lực từ 01/07/2025).
 * Dùng cho ô "Tỉnh/Thành phố" của form gửi tin / khiếu nại.
 *
 * TẠI SAO để ở backend? Đây là nguồn DUY NHẤT: backend dùng để kiểm tra giá trị gửi lên có hợp lệ không,
 * còn frontend lấy danh sách qua API GET /api/submissions/options (không phải chép lại danh sách ở 2 nơi).
 */
public final class VietnamProvinces {

    public static final List<String> ALL = List.of(
            // 6 thành phố trực thuộc trung ương
            "Thành phố Hà Nội",
            "Thành phố Hồ Chí Minh",
            "Thành phố Hải Phòng",
            "Thành phố Đà Nẵng",
            "Thành phố Cần Thơ",
            "Thành phố Huế",
            // 28 tỉnh (xếp theo bảng chữ cái)
            "An Giang",
            "Bắc Ninh",
            "Cà Mau",
            "Cao Bằng",
            "Đắk Lắk",
            "Điện Biên",
            "Đồng Nai",
            "Đồng Tháp",
            "Gia Lai",
            "Hà Tĩnh",
            "Hưng Yên",
            "Khánh Hòa",
            "Lai Châu",
            "Lâm Đồng",
            "Lạng Sơn",
            "Lào Cai",
            "Nghệ An",
            "Ninh Bình",
            "Phú Thọ",
            "Quảng Ngãi",
            "Quảng Ninh",
            "Quảng Trị",
            "Sơn La",
            "Tây Ninh",
            "Thái Nguyên",
            "Thanh Hóa",
            "Tuyên Quang",
            "Vĩnh Long");

    private VietnamProvinces() {
    }

    public static boolean isValid(String province) {
        return province != null && ALL.contains(province);
    }
}
