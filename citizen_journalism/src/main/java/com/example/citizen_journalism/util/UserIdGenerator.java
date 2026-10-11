package com.example.citizen_journalism.util;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Sinh mã người dùng dạng 2 chữ cái + 4 số theo vai trò, ví dụ CT0001 (Người dân), AD0001 (Admin).
 *
 * TẠI SAO cần? Theo tài liệu SRS, cột users.id là VARCHAR(10) dạng "HE1941", không phải số tự tăng,
 * nên database không tự sinh được -> mình phải tự sinh trước khi lưu.
 * Tiền tố của từng vai trò khai báo trong enum User.Role.
 *
 * CÁCH SINH: lấy mã lớn nhất hiện có của tiền tố đó rồi +1 (CT0041 -> CT0042).
 * Giới hạn: mỗi vai trò tối đa 9999 tài khoản, đủ dùng cho đồ án.
 *
 * @Component: để Spring quản lý lớp này và tự tiêm (inject) vào nơi cần dùng (AuthService).
 */
@Component
@RequiredArgsConstructor
public class UserIdGenerator {

    private static final int MAX_SEQUENCE = 9999;

    private final UserRepository userRepository;

    public String next(User.Role role) {
        String prefix = role.getIdPrefix(); // Ví dụ CITIZEN -> "CT"
        int nextNumber = userRepository.findMaxIdByPrefix(prefix)
                .map(maxId -> Integer.parseInt(maxId.substring(prefix.length())) + 1) // "CT0041" -> 41 + 1
                .orElse(1); // Chưa có ai thuộc vai trò này -> bắt đầu từ 1
        if (nextNumber > MAX_SEQUENCE) {
            throw new IllegalStateException("Đã hết mã người dùng cho vai trò " + role);
        }
        return prefix + String.format("%04d", nextNumber); // %04d: đủ 4 chữ số, 42 -> "0042"
    }
}
