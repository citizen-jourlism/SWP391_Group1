package com.example.citizen_journalism.dto.assignment;

/**
 * Một Cộng tác viên trên màn hình chọn người giao nhiệm vụ (mỗi người là 1 thẻ).
 *
 * @param performanceScore điểm hiệu suất
 * @param activeTasks      số nhiệm vụ đang nhận (chờ phản hồi + đang làm)
 * @param completedTasks   số nhiệm vụ đã hoàn thành
 * @param sameArea         tỉnh của CTV trùng nơi xảy ra vụ việc
 */
public record ContributorCandidate(
        String id,
        String fullName,
        String avatarUrl,
        String province,
        String ward,
        String address,
        int performanceScore,
        long activeTasks,
        long completedTasks,
        boolean sameArea) {
}
