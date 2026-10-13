package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * REPOSITORY = lớp nói chuyện với database cho bảng "users".
 *
 * Chỉ cần khai báo interface, Spring Data JPA TỰ VIẾT code SQL:
 *   - Kế thừa JpaRepository<User, String> (String là kiểu của khoá chính id) là có sẵn
 *     save(), findById(), findAll(), delete()...
 *   - Hàm đặt tên theo quy tắc (findByEmail) -> Spring tự hiểu: SELECT * FROM users WHERE email = ?
 *   - Truy vấn phức tạp hơn thì viết tay bằng @Query (ngôn ngữ JPQL, dùng tên class/thuộc tính Java).
 *
 * Optional<...>: "có thể có hoặc không". Buộc người gọi xử lý trường hợp không tìm thấy, tránh lỗi null.
 */
public interface UserRepository extends JpaRepository<User, String> {

    /** Tìm người dùng theo email (email là duy nhất). */
    Optional<User> findByEmail(String email);

    /** Email đã thuộc về một tài khoản nào chưa (kiểm tra trước khi đổi email). */
    boolean existsByEmail(String email);

    /** Số CCCD đã được NGƯỜI KHÁC (khác id) dùng chưa. -> WHERE citizen_id = ? AND id <> ? */
    boolean existsByCitizenIdAndIdNot(String citizenId, String id);

    /**
     * Lấy người dùng ĐANG HOẠT ĐỘNG theo mã (lấy từ token đăng nhập). Không có / bị khoá -> lỗi 401.
     * "default method": interface cũng viết được hàm có thân. Dùng chung cho AuthService và UserService,
     * tránh lặp lại cùng một đoạn kiểm tra ở nhiều nơi.
     */
    default User getActiveById(String id) {
        return findById(id)
                .filter(user -> user.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() -> AppException.unauthorized("Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại."));
    }

    /**
     * Mã lớn nhất hiện có theo tiền tố, ví dụ prefix "CT" -> "CT0042". Dùng để sinh mã tiếp theo (CT0043).
     * So sánh chuỗi vẫn đúng thứ tự vì mọi mã đều cùng độ dài (2 chữ + 4 số).
     */
    @Query("select max(u.id) from User u where u.id like concat(:prefix, '%')")
    Optional<String> findMaxIdByPrefix(@Param("prefix") String prefix);
}
