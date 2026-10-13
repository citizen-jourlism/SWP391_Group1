package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;
import static com.example.citizen_journalism.util.TextUtils.normalizeEmail;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.admin.AdminStats;
import com.example.citizen_journalism.dto.admin.AdminUserItem;
import com.example.citizen_journalism.dto.admin.CreateUserRequest;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.UserIdGenerator;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nghiệp vụ của QUẢN TRỊ HỆ THỐNG (SYSTEM_ADMIN) – được AdminController gọi.
 * Chỉ admin mới gọi được (SecurityConfig chặn /api/admin/** theo vai trò).
 *
 * Gồm: số liệu tổng quan, tìm kiếm/lọc người dùng, tạo tài khoản nội bộ, khoá/mở khoá, đổi vai trò.
 *
 * QUY TẮC "CHỈ CÓ MỘT ADMIN" (theo yêu cầu nhóm):
 *   - Không tạo được tài khoản SYSTEM_ADMIN mới, không đổi vai trò ai thành SYSTEM_ADMIN.
 *   - Không khoá / đổi vai trò được chính tài khoản SYSTEM_ADMIN (tránh tự khoá mình -> mất quyền quản trị).
 * Tài khoản admin duy nhất được tạo tự động lúc khởi động (config/AdminAccountInitializer).
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserIdGenerator userIdGenerator;

    // ============================== SỐ LIỆU TỔNG QUAN ==============================

    @Transactional(readOnly = true)
    public AdminStats getStats() {
        // EnumMap: giữ đúng thứ tự khai báo các vai trò trong enum Role -> biểu đồ hiển thị ổn định.
        Map<User.Role, Long> byRole = new EnumMap<>(User.Role.class);
        for (User.Role role : User.Role.values()) {
            byRole.put(role, userRepository.countByRole(role));
        }
        return new AdminStats(
                userRepository.count(),
                userRepository.countByStatus(User.Status.ACTIVE),
                userRepository.countByStatus(User.Status.PENDING_OTP),
                userRepository.countByStatus(User.Status.LOCKED),
                userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7)),
                byRole,
                submissionRepository.count(),
                submissionRepository.countByStatus(Submission.SubmissionStatus.PENDING),
                userRepository.findTop5ByOrderByCreatedAtDesc().stream().map(AdminUserItem::from).toList());
    }

    // ============================ DANH SÁCH NGƯỜI DÙNG ============================

    /**
     * Tìm kiếm + lọc + phân trang, mới nhất lên trước.
     * @param page trang (bắt đầu từ 0); size số dòng mỗi trang (tối đa MAX_PAGE_SIZE để tránh tải quá nhiều)
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminUserItem> searchUsers(String keyword, User.Role role, User.Status status, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE); // giới hạn trong khoảng 1..MAX_PAGE_SIZE
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.from(userRepository.search(blankToNull(keyword), role, status, pageRequest)
                .map(AdminUserItem::from));
    }

    // =========================== TẠO / SỬA TÀI KHOẢN ===========================

    /** Tạo tài khoản nội bộ, dùng được ngay (ACTIVE, đã xác thực), không cần OTP. */
    @Transactional
    public AdminUserItem createUser(CreateUserRequest request) {
        rejectAdminRole(request.role());
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw AppException.conflict("Email này đã được sử dụng bởi một tài khoản khác.");
        }
        User user = User.builder()
                .id(userIdGenerator.next(request.role())) // Ví dụ Biên tập viên -> ED0001
                .role(request.role())
                .status(User.Status.ACTIVE)
                .isVerified(true)
                .email(email)
                .fullName(request.fullName().trim())
                .phone(request.phone().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();
        return AdminUserItem.from(userRepository.save(user));
    }

    /** Khoá (LOCKED) hoặc mở khoá (ACTIVE). Người bị khoá sẽ bị đăng xuất ở lần gọi API kế tiếp. */
    @Transactional
    public AdminUserItem updateStatus(String userId, User.Status status) {
        if (status == User.Status.PENDING_OTP) {
            throw AppException.badRequest("Chỉ có thể khoá hoặc mở khoá tài khoản.");
        }
        User user = findManageableUser(userId);
        user.setStatus(status);
        if (status == User.Status.ACTIVE) {
            user.setIsVerified(true);   // Mở khoá một tài khoản chưa xác thực = admin xác nhận hộ
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);  // Gỡ luôn khoá tạm do nhập sai mật khẩu (nếu có)
        }
        return AdminUserItem.from(user);
    }

    /**
     * Đổi vai trò (ví dụ Người dân -> Cộng tác viên). Mã người dùng giữ nguyên (CT0001 vẫn là CT0001)
     * vì mã là định danh cố định, đã được dùng ở các bảng khác.
     */
    @Transactional
    public AdminUserItem updateRole(String userId, User.Role role) {
        rejectAdminRole(role);
        User user = findManageableUser(userId);
        user.setRole(role);
        return AdminUserItem.from(user);
    }

    // ================================= HÀM PHỤ =================================

    /** Tìm người dùng để thao tác; KHÔNG cho thao tác lên tài khoản quản trị. */
    private User findManageableUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản " + userId + "."));
        if (user.getRole() == User.Role.SYSTEM_ADMIN) {
            throw AppException.badRequest("Không thể thay đổi tài khoản quản trị hệ thống.");
        }
        return user;
    }

    private void rejectAdminRole(User.Role role) {
        if (role == User.Role.SYSTEM_ADMIN) {
            throw AppException.badRequest("Hệ thống chỉ có một tài khoản quản trị, không thể cấp thêm quyền này.");
        }
    }
}
