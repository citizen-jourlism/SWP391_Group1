package com.example.citizen_journalism.util;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Sinh mã người dùng dạng 2 chữ cái + 4 số theo vai trò, ví dụ CT0001, AD0001. */
@Component
@RequiredArgsConstructor
public class UserIdGenerator {

    private static final int MAX_SEQUENCE = 9999;

    private final UserRepository userRepository;

    public String next(User.Role role) {
        String prefix = role.getIdPrefix();
        int nextNumber = userRepository.findMaxIdByPrefix(prefix)
                .map(maxId -> Integer.parseInt(maxId.substring(prefix.length())) + 1)
                .orElse(1);
        if (nextNumber > MAX_SEQUENCE) {
            throw new IllegalStateException("Đã hết mã người dùng cho vai trò " + role);
        }
        return prefix + String.format("%04d", nextNumber);
    }
}
