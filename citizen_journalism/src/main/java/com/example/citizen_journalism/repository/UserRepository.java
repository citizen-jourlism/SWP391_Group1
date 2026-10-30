package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /** Email đã thuộc về một tài khoản nào chưa (kiểm tra trước khi đổi email / tạo tài khoản). */
    boolean existsByEmail(String email);

    /** Tìm theo tên đăng nhập, không phân biệt hoa thường ("admin" = "Admin"). */
    Optional<User> findByUsernameIgnoreCase(String username);

    /** Đã có tài khoản thuộc vai trò này chưa (dùng để đảm bảo chỉ có 1 admin). */
    boolean existsByRole(User.Role role);

    // ----- Thống kê cho Dashboard admin (AdminService.getStats) -----
    long countByRole(User.Role role);

    long countByStatus(User.Status status);

    long countByCreatedAtAfter(LocalDateTime time);

    /** 5 tài khoản đăng ký gần nhất. */
    List<User> findTop5ByOrderByCreatedAtDesc();

    /**
     * Tìm kiếm + lọc + phân trang danh sách người dùng cho trang admin.
     * Tham số nào null thì bỏ qua điều kiện đó (":role is null or ..."):
     *   - keyword: khớp một phần (không phân biệt hoa thường) với họ tên, email, mã người dùng hoặc SĐT
     *   - role, status: lọc đúng giá trị
     * Pageable: Spring tự thêm LIMIT/OFFSET + ORDER BY theo trang và cách sắp xếp truyền vào.
     */
    @Query("""
            select u from User u
            where (:keyword is null
                   or lower(u.fullName) like lower(concat('%', :keyword, '%'))
                   or lower(u.email) like lower(concat('%', :keyword, '%'))
                   or lower(u.id) like lower(concat('%', :keyword, '%'))
                   or u.phone like concat('%', :keyword, '%'))
              and (:role is null or u.role = :role)
              and (:status is null or u.status = :status)
            """)
    Page<User> search(@Param("keyword") String keyword,
                      @Param("role") User.Role role,
                      @Param("status") User.Status status,
                      Pageable pageable);

    /**
     * Cộng tác viên đang hoạt động cho màn hình chọn người giao nhiệm vụ (FieldAssignmentService).
     * Tham số nào null thì bỏ qua: province, ward = đúng tỉnh, phường/xã; keyword = khớp một phần họ tên, địa chỉ.
     * coalesce: CTV cũ chưa có điểm hiệu suất thì tính bằng điểm khởi đầu.
     */
    @Query("""
            select u from User u
            where u.role = com.example.citizen_journalism.entity.User.Role.CONTRIBUTOR
              and u.status = com.example.citizen_journalism.entity.User.Status.ACTIVE
              and (:province is null or u.province = :province)
              and (:ward is null or u.ward = :ward)
              and (:keyword is null
                   or lower(u.fullName) like lower(concat('%', :keyword, '%'))
                   or lower(u.address) like lower(concat('%', :keyword, '%'))
                   or lower(u.ward) like lower(concat('%', :keyword, '%'))
                   or lower(u.province) like lower(concat('%', :keyword, '%')))
              and coalesce(u.performanceScore, 100) >= :minScore
            """)
    List<User> findContributorCandidates(@Param("province") String province, @Param("ward") String ward,
                                         @Param("keyword") String keyword, @Param("minScore") int minScore);

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
