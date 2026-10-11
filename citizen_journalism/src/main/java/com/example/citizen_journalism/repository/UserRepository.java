package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    /** Mã lớn nhất hiện có theo tiền tố (ví dụ "CT" -> "CT0042"), dùng để sinh mã tiếp theo. */
    @Query("select max(u.id) from User u where u.id like concat(:prefix, '%')")
    Optional<String> findMaxIdByPrefix(@Param("prefix") String prefix);
}
