package com.example.citizen_journalism.util;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation GỘP các quy tắc của một mật khẩu hợp lệ, dùng cho MỌI chỗ nhận mật khẩu MỚI:
 * đăng ký (RegisterRequest), đặt lại mật khẩu (ResetPasswordRequest), đổi mật khẩu (ChangePasswordRequest).
 *
 * Quy tắc: không trống, 8–64 ký tự, có ít nhất 1 chữ cái và 1 chữ số.
 *
 * TẠI SAO? Trước đây mỗi DTO phải lặp lại 3 annotation @NotBlank + @Size + @Pattern. Gộp lại thì
 * chỉ cần viết @StrongPassword, và muốn đổi quy tắc thì sửa ở đúng 1 chỗ này.
 * Phía frontend có quy tắc tương ứng: rules.password() trong frontend/src/lib/validators.js.
 *
 * Kỹ thuật "composed constraint" của Jakarta Validation: các annotation đặt trên @interface này
 * sẽ được áp dụng cho trường dùng @StrongPassword. Mỗi annotation con tự báo lỗi bằng message riêng.
 * validatedBy = {}: không cần lớp kiểm tra riêng vì đã dùng các annotation có sẵn.
 */
@NotBlank(message = "Vui lòng nhập mật khẩu.")
@Size(min = 8, max = 64, message = "Mật khẩu phải từ 8 đến 64 ký tự.")
@Pattern(regexp = ValidationRules.PASSWORD_REGEX, message = ValidationRules.PASSWORD_MESSAGE)
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface StrongPassword {

    // 3 thuộc tính bắt buộc theo chuẩn Jakarta Validation (không cần dùng tới).
    String message() default "Mật khẩu không hợp lệ.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
