package com.example.citizen_journalism.dto.contributor;

import java.util.List;

/**
 * KẾT QUẢ KIỂM TRA ĐIỀU KIỆN đăng ký Cộng tác viên (SRS: "eligible Citizen").
 * Frontend hiện thành danh sách ✓ / ✗ để người dân biết còn thiếu gì.
 *
 * @param eligible true khi MỌI điều kiện đều đạt
 * @param checks   từng điều kiện
 */
public record ContributorEligibility(boolean eligible, List<Check> checks) {

    /**
     * @param key    mã điều kiện cho máy đọc (frontend dùng làm key khi vẽ danh sách)
     * @param label  điều kiện, ví dụ "Đủ 18 tuổi trở lên"
     * @param passed đạt hay chưa
     * @param hint   gợi ý cách khắc phục khi chưa đạt
     */
    public record Check(String key, String label, boolean passed, String hint) {
    }

    public static ContributorEligibility of(List<Check> checks) {
        return new ContributorEligibility(checks.stream().allMatch(Check::passed), checks);
    }
}
