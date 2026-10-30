package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thông tin một tài khoản cho admin: dùng cho cả bảng quản lý tài khoản lẫn trang chi tiết /admin/users/:id.
 * Có thêm trạng thái (status), tên đăng nhập, CCCD... so với UserSummary,
 * nhưng KHÔNG BAO GIỜ có mật khẩu / giấy tờ (dữ liệu tệp).
 */
public record AdminUserItem(
        String id,
        String fullName,
        String email,
        String phone,
        String username,
        User.Role role,
        User.Status status,
        String avatarUrl,
        Integer reputationScore,
        Integer performanceScore,
        String workingProvince,
        LocalDateTime createdAt,
        int rewardPoints,
        String citizenId,
        String address,
        LocalDate dateOfBirth,
        User.UpgradeStatus upgradeStatus,
        String expertiseFields,
        LocalDateTime lockedUntil,
        LocalDateTime updatedAt
) {

    public static AdminUserItem from(User user) {
        return new AdminUserItem(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getUsername(),
                user.getRole(),
                user.getStatus(),
                user.getAvatarUrl(),
                user.getReputationScore(),
                user.getRole() == User.Role.CONTRIBUTOR ? user.performanceScoreOrDefault() : null,
                user.getWorkingProvince(),
                user.getCreatedAt(),
                user.getRewardPoints(),
                user.getCitizenId(),
                user.getAddress(),
                user.getDateOfBirth(),
                user.getUpgradeStatus(),
                user.getExpertiseFields(),
                user.getLockedUntil(),
                user.getUpdatedAt());
    }
}
