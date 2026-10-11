package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.OtpToken;
import com.example.citizen_journalism.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY cho bảng "otp_tokens" (xem giải thích chung trong UserRepository).
 */
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    /**
     * Mã OTP MỚI NHẤT của một người dùng cho một mục đích. Các mã cũ hơn coi như vô hiệu.
     *
     * Spring tự dịch tên hàm thành SQL:
     *   findTop...            -> LIMIT 1 (chỉ lấy 1 dòng)
     *   ByUserAndPurpose      -> WHERE user_id = ? AND purpose = ?
     *   OrderByCreatedAtDesc  -> sắp xếp mới nhất trước
     *   IdDesc                -> nếu 2 mã tạo cùng thời điểm thì lấy id lớn hơn (tạo sau)
     */
    Optional<OtpToken> findTopByUserAndPurposeOrderByCreatedAtDescIdDesc(User user, OtpToken.Purpose purpose);
}
