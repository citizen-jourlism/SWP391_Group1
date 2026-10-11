package com.example.citizen_journalism.dto.auth;

import com.example.citizen_journalism.util.ValidationRules;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(max = 100, message = "Họ và tên tối đa 100 ký tự.")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không đúng định dạng.")
        @Size(max = 255, message = "Email tối đa 255 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @Pattern(regexp = ValidationRules.PHONE_REGEX, message = ValidationRules.PHONE_MESSAGE)
        String phone,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = 8, max = 64, message = "Mật khẩu phải từ 8 đến 64 ký tự.")
        @Pattern(regexp = ValidationRules.PASSWORD_REGEX, message = ValidationRules.PASSWORD_MESSAGE)
        String password
) {
}
