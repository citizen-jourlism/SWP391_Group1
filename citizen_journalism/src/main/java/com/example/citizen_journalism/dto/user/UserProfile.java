package com.example.citizen_journalism.dto.user;

import com.example.citizen_journalism.entity.User;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thông tin ĐẦY ĐỦ hiển thị ở trang Hồ sơ (GET /api/users/me). Rộng hơn UserSummary.
 * Vẫn KHÔNG có mật khẩu, file giấy tờ... (những thứ không được lộ ra ngoài).
 *
 * reputationScore: chỉ để XEM, người dùng không sửa được (UpdateProfileRequest không có trường này).
 */
public record UserProfile(
        String id,
        String fullName,
        String email,
        String phone,
        String citizenId,
        String province,
        String ward,
        String address,
        LocalDate dateOfBirth,   // Gửi về dạng "2001-05-20"
        String avatarUrl,
        User.Role role,
        Integer reputationScore,
        Integer performanceScore, // Chỉ Cộng tác viên có; thay cho điểm uy tín của vai trò này
        int rewardPoints,
        LocalDateTime createdAt  // Ngày tham gia
) {

    public static UserProfile from(User user) {
        return new UserProfile(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getCitizenId(),
                user.getProvince(),
                user.getWard(),
                user.getAddress(),
                user.getDateOfBirth(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getReputationScore(),
                user.getRole() == User.Role.CONTRIBUTOR ? user.performanceScoreOrDefault() : null,
                user.getRewardPoints(),
                user.getCreatedAt());
    }
}
