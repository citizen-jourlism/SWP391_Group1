package com.example.citizen_journalism.dto.user;

import com.example.citizen_journalism.util.ValidationRules;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Dữ liệu gửi lên khi bấm "Lưu thay đổi" ở trang Hồ sơ: PUT /api/users/me
 *
 * Chỉ gồm các trường người dùng ĐƯỢC SỬA. Không có email (đổi email có luồng xác nhận OTP riêng),
 * không có điểm uy tín / điểm thưởng (chỉ hệ thống thay đổi).
 * citizenId, address, dateOfBirth không bắt buộc: để trống (null) là hợp lệ.
 * (@Pattern và @Past bỏ qua giá trị null, chỉ kiểm tra khi có nhập.)
 */
public record UpdateProfileRequest(
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
        LocalDate dateOfBirth
) {
}
