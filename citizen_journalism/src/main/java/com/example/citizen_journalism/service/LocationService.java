package com.example.citizen_journalism.service;

import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.util.VietnamProvinces;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * DANH SÁCH PHƯỜNG/XÃ theo từng tỉnh, thành phố (đơn vị hành chính có hiệu lực từ 01/07/2025, 2 cấp: tỉnh -> phường/xã).
 * Dùng cho ô địa chỉ ở trang Hồ sơ, trang sửa tài khoản của admin và bộ lọc khi chọn Cộng tác viên.
 *
 * Dữ liệu nằm sẵn trong resources/data/vietnam-wards.json (khoảng 3.300 dòng, gần như không đổi) nên chỉ đọc
 * 1 lần lúc khởi động. Để sẵn trong dự án thì web chạy được kể cả khi không có mạng và không phụ thuộc trang ngoài.
 */
@Service
public class LocationService {

    private static final String DATA_FILE = "data/vietnam-wards.json";

    /** Tên tỉnh (đúng như trong util/VietnamProvinces) -> danh sách tên phường/xã. */
    private final Map<String, List<String>> wardsByProvince;

    public LocationService(ObjectMapper objectMapper) {
        try (InputStream data = new ClassPathResource(DATA_FILE).getInputStream()) {
            wardsByProvince = objectMapper.readValue(data, new TypeReference<>() { });
        } catch (IOException ex) {
            throw new IllegalStateException("Không đọc được dữ liệu phường/xã: " + DATA_FILE, ex);
        }
    }

    /** Phường/xã của 1 tỉnh; tỉnh không tồn tại thì trả về danh sách rỗng. */
    public List<String> getWards(String province) {
        return wardsByProvince.getOrDefault(province, List.of());
    }

    /**
     * Kiểm tra tỉnh + phường/xã người dùng chọn (cả 2 đều không bắt buộc), sai thì báo lỗi ngay dưới ô tương ứng.
     * Phường/xã phải thuộc đúng tỉnh đã chọn, vì nhiều tỉnh có phường/xã trùng tên nhau.
     */
    public void checkAddress(String province, String ward) {
        if (province != null && !VietnamProvinces.isValid(province)) {
            throw AppException.invalidFields(Map.of("province", "Tỉnh/thành phố không hợp lệ."));
        }
        if (ward != null && province == null) {
            throw AppException.invalidFields(Map.of("province", "Vui lòng chọn tỉnh/thành phố."));
        }
        if (ward != null && !getWards(province).contains(ward)) {
            throw AppException.invalidFields(Map.of("ward", "Phường/xã không thuộc tỉnh/thành phố đã chọn."));
        }
    }
}
