package com.example.citizen_journalism.dto.auth;

import com.example.citizen_journalism.dto.user.UserSummary;
import java.time.Instant;

/**
 * Kết quả trả về khi đăng nhập thành công.
 *
 * - accessToken: chuỗi JWT. Frontend lưu lại và gửi kèm mọi request sau:
 *                header "Authorization: Bearer <accessToken>" (tự động trong frontend/src/lib/api.js).
 * - expiresAt  : thời điểm token hết hạn (sau thời điểm này phải đăng nhập lại).
 * - user       : thông tin người dùng để hiện tên, vai trò trên giao diện.
 */
public record LoginResponse(String accessToken, Instant expiresAt, UserSummary user) {
}
