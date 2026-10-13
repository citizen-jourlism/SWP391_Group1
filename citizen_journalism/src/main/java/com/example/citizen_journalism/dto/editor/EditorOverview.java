package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.SubmissionSummary;
import java.util.List;

/**
 * Số liệu cho trang TỔNG QUAN của bàn làm việc Biên tập viên (GET /api/editor/overview).
 *
 * @param pendingHotNews      tin nóng mới chờ tiếp nhận (trạng thái PENDING)
 * @param pendingComplaints   khiếu nại / phản ánh mới chờ tiếp nhận
 * @param inReview            hồ sơ đang thẩm định
 * @param needMoreInfo        hồ sơ đang chờ người dân bổ sung
 * @param pendingApplications đơn đăng ký CTV chờ Biên tập viên xét
 * @param recentSubmissions   5 hồ sơ mới nhất đang chờ tiếp nhận
 * @param recentApplications  5 đơn CTV mới nhất đang chờ xét
 */
public record EditorOverview(
        long pendingHotNews,
        long pendingComplaints,
        long inReview,
        long needMoreInfo,
        long pendingApplications,
        List<SubmissionSummary> recentSubmissions,
        List<ApplicationListItem> recentApplications) {
}
