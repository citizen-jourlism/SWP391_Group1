package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import java.util.List;
import java.util.Map;

/**
 * Số liệu tổng quan cho trang Dashboard admin (GET /api/admin/stats).
 *
 * - usersByRole: số người theo từng vai trò, ví dụ { CITIZEN: 12, EDITOR: 3, ... } (đủ mọi vai trò, kể cả = 0)
 * - newUsersLast7Days: số tài khoản tạo trong 7 ngày gần nhất
 * - totalSubmissions / pendingSubmissions: tổng tin/bài và số đang chờ tiếp nhận (PENDING)
 * - recentUsers: 5 tài khoản đăng ký gần nhất
 */
public record AdminStats(
        long totalUsers,
        long activeUsers,
        long pendingUsers,
        long lockedUsers,
        long newUsersLast7Days,
        Map<User.Role, Long> usersByRole,
        long totalSubmissions,
        long pendingSubmissions,
        List<AdminUserItem> recentUsers
) {
}
