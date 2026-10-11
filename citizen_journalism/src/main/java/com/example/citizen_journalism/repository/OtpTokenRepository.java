package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.OtpToken;
import com.example.citizen_journalism.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    /** Mã OTP mới nhất của người dùng cho một mục đích. Các mã cũ hơn coi như vô hiệu. */
    Optional<OtpToken> findTopByUserAndPurposeOrderByCreatedAtDescIdDesc(User user, OtpToken.Purpose purpose);
}
