package com.example.citizen_journalism.dto.admin;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.util.ValidationRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Admin SỬA THÔNG TIN + VAI TRÒ của một tài khoản: PUT /api/admin/users/{id}
 * (trang /admin/users/:id, bấm "Lưu thay đổi" rồi xác nhận).
 *
 * Các trường thông tin giống hệt UpdateProfileRequest (người dùng tự sửa ở trang Hồ sơ), thêm role.
 * KHÔNG có email / tên đăng nhập: đó là thông tin đăng nhập, email đổi qua luồng OTP riêng của người dùng.
 * role không được là SYSTEM_ADMIN (AdminService kiểm tra).
 * province, ward: tỉnh + phường/xã, AdminService kiểm tra phường/xã có thuộc tỉnh không.
 */
public record AdminUpdateUserRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự.")
        String fullName,

        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @Pattern(regexp = ValidationRules.PHONE_REGEX, message = ValidationRules.PHONE_MESSAGE)
        String phone,

        @Pattern(regexp = ValidationRules.CITIZEN_ID_REGEX, message = ValidationRules.CITIZEN_ID_MESSAGE)
        String citizenId,

        @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự.")
        String address,

        @Past(message = "Ngày sinh phải là một ngày trong quá khứ.")
        LocalDate dateOfBirth,

        @NotNull(message = "Vui lòng chọn vai trò.")
        User.Role role,

        String province,

        String ward
) {
}
