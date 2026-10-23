package com.example.citizen_journalism.dto.contributor;

import com.example.citizen_journalism.entity.ContributorApplication.Availability;
import com.example.citizen_journalism.util.ExpertiseFields;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Dữ liệu chữ của FORM ĐĂNG KÝ CỘNG TÁC VIÊN (phần "data" của request multipart; giấy tờ ở phần "files").
 * Quy tắc khớp frontend (components/contributor/ContributorApplyForm.jsx).
 * Kiểm tra thêm trong ContributorApplicationService: lĩnh vực / tỉnh phải nằm trong danh sách cho phép.
 */
public record ApplyContributorRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất 1 lĩnh vực.")
        @Size(max = ExpertiseFields.MAX_SELECTED, message = "Chọn tối đa " + ExpertiseFields.MAX_SELECTED + " lĩnh vực.")
        List<String> expertiseFields,

        @NotBlank(message = "Vui lòng chọn khu vực tác nghiệp.")
        String province,

        @NotBlank(message = "Vui lòng nhập nghề nghiệp hiện tại.")
        @Size(max = 100, message = "Nghề nghiệp tối đa 100 ký tự.")
        String occupation,

        @NotNull(message = "Vui lòng chọn thời gian có thể nhận nhiệm vụ.")
        Availability availability,

        @NotBlank(message = "Vui lòng giới thiệu kinh nghiệm và lý do đăng ký.")
        @Size(min = 50, max = 2000, message = "Phần giới thiệu dài từ 50 đến 2000 ký tự.")
        String experience,

        @AssertTrue(message = "Bạn cần đồng ý với cam kết của Cộng tác viên.")
        boolean commitment
) {
}
