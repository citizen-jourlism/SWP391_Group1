package com.example.citizen_journalism.dto.user;

import com.example.citizen_journalism.entity.User;

/**
 * Thông tin CƠ BẢN của một người dùng gửi về frontend (KHÔNG có mật khẩu, file giấy tờ...).
 *
 * Dùng ở: kết quả đăng nhập (LoginResponse), GET /api/auth/me (biết ai đang đăng nhập),
 * sau này là danh sách người dùng của trang admin.
 *
 * TẠI SAO không trả thẳng entity User? Entity chứa passwordHash, file giấy tờ... không được lộ ra ngoài.
 * DTO chỉ chọn đúng những trường cần hiển thị.
 */
public record UserSummary(
        String id,
        String fullName,
        String email,
        String phone,
        User.Role role,
        Integer reputationScore
) {

    /** Chuyển entity -> DTO. Viết 1 chỗ để mọi nơi dùng chung. */
    public static UserSummary from(User user) {
        return new UserSummary(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getReputationScore());
    }
}
