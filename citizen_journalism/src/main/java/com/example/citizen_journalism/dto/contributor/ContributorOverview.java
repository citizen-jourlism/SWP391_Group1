package com.example.citizen_journalism.dto.contributor;

import com.example.citizen_journalism.entity.User;
import java.util.List;

/**
 * MỌI THỨ mục "Cộng tác viên" trong trang Hồ sơ cần, gói trong 1 lần gọi (GET /api/contributor-applications/me):
 *
 * @param role        vai trò hiện tại (CITIZEN: được đăng ký; CONTRIBUTOR: đã là CTV)
 * @param eligibility đủ điều kiện nộp đơn chưa, thiếu điều kiện nào
 * @param current     đơn GẦN NHẤT (đang xét hoặc đã có kết quả), null nếu chưa nộp lần nào
 * @param history     các đơn cũ hơn
 * @param options     dữ liệu cho form: danh sách lĩnh vực, tỉnh/thành, giới hạn tệp giấy tờ
 */
public record ContributorOverview(
        User.Role role,
        ContributorEligibility eligibility,
        ApplicationView current,
        List<ApplicationView> history,
        FormOptions options) {

    /** Giống SubmissionFormOptions: giới hạn khai báo 1 lần ở backend, frontend chỉ đọc về. */
    public record FormOptions(
            List<String> expertiseFields,
            int maxExpertiseFields,
            List<String> provinces,
            int maxFiles,
            long maxFileSizeMb,
            long maxTotalSizeMb,
            List<String> acceptedTypes) {
    }
}
