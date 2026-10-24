package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import java.time.LocalDateTime;

/**
 * Một dòng trong bảng quản lý tài khoản của admin. Có thêm trạng thái (status) và tên đăng nhập
 * so với UserSummary, vẫn KHÔNG có mật khẩu / giấy tờ.
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
        LocalDateTime createdAt
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
                user.getCreatedAt());
    }
}
