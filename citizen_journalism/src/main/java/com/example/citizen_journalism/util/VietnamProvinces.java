package com.example.citizen_journalism.util;

import java.util.List;

public final class VietnamProvinces {

    public static final List<String> ALL = List.of(
            "Thành phố Hà Nội",
            "Thành phố Hồ Chí Minh",
            "Thành phố Hải Phòng",
            "Thành phố Đà Nẵng",
            "Thành phố Cần Thơ",
            "Thành phố Huế",
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