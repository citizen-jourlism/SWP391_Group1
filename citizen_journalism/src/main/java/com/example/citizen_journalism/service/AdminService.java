package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;
import static com.example.citizen_journalism.util.TextUtils.normalizeEmail;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.admin.AdminStats;
import com.example.citizen_journalism.dto.admin.AdminUpdateUserRequest;
import com.example.citizen_journalism.dto.admin.AdminUserItem;
import com.example.citizen_journalism.dto.admin.CreateUserRequest;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ContributorApplicationRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.Paging;
import com.example.citizen_journalism.util.UserIdGenerator;
import com.example.citizen_journalism.util.VietnamProvinces;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

/**
 * Nghiệp vụ của QUẢN TRỊ HỆ THỐNG (SYSTEM_ADMIN) – được AdminController gọi.
 * Chỉ admin mới gọi được (SecurityConfig chặn /api/admin/** theo vai trò).
 *
 * Gồm: số liệu tổng quan, tìm kiếm/lọc người dùng, tạo tài khoản nội bộ, khoá/mở khoá, xem chi tiết + sửa thông tin / vai trò, đặt lại mật khẩu.
 *
 * QUY TẮC "CHỈ CÓ MỘT ADMIN" (theo yêu cầu nhóm):
 *   - Không tạo được tài khoản SYSTEM_ADMIN mới, không đổi vai trò ai thành SYSTEM_ADMIN.
 *   - Không khoá / đổi vai trò được chính tài khoản SYSTEM_ADMIN (tránh tự khoá mình -> mất quyền quản trị).
 * Tài khoản admin duy nhất được tạo tự động lúc khởi động (config/AdminAccountInitializer).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ContributorApplicationRepository applicationRepository;
    private final SubmissionRepository submissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserIdGenerator userIdGenerator;
    private final MailService mailService;

    private static final SecureRandom RANDOM = new SecureRandom();

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
     * @param page trang (bắt đầu từ 0); size số dòng mỗi trang (Paging tự giới hạn để tránh tải quá nhiều)
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminUserItem> searchUsers(String keyword, User.Role role, User.Status status, int page, int size) {
        return PageResponse.from(userRepository.search(blankToNull(keyword), role, status,
                Paging.of(page, size, Paging.NEWEST_FIRST)).map(AdminUserItem::from));
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
        String username = blankToNull(request.username());
        // IgnoreCase: "TestEditor" và "testeditor" coi là trùng (đăng nhập cũng không phân biệt hoa thường)
        if (username != null && userRepository.findByUsernameIgnoreCase(username).isPresent()) {
            throw AppException.conflict("Tên đăng nhập này đã có người dùng.");
        }
        User user = User.builder()
                .id(userIdGenerator.next(request.role())) // Ví dụ Biên tập viên -> ED0001
                .role(request.role())
                .status(User.Status.ACTIVE)
                .isVerified(true)
                .email(email)
                .username(username)
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

    /** Chi tiết một tài khoản (trang /admin/users/:id). Xem được cả tài khoản admin, chỉ là không sửa được. */
    @Transactional(readOnly = true)
    public AdminUserItem getUser(String userId) {
        return AdminUserItem.from(userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy tài khoản " + userId + ".")));
    }

    /**
     * Sửa thông tin cá nhân + vai trò trong MỘT lần lưu (cùng transaction: lỗi thì không đổi gì cả).
     * Đổi vai trò: mã người dùng giữ nguyên (CT0001 vẫn là CT0001) vì mã là định danh cố định, đã được dùng ở các bảng khác;
     * vai trò mới có hiệu lực ngay ở request tiếp theo (ActiveUserJwtConverter lấy vai trò từ DB).
     */
    @Transactional
    public AdminUserItem updateUser(String userId, AdminUpdateUserRequest request) {
        rejectAdminRole(request.role());
        User user = findManageableUser(userId);

        String citizenId = blankToNull(request.citizenId());
        if (citizenId != null && userRepository.existsByCitizenIdAndIdNot(citizenId, userId)) {
            // invalidFields: lỗi hiện ngay dưới ô CCCD trên form
            throw AppException.invalidFields(Map.of("citizenId", "Số CCCD này đã được đăng ký cho một tài khoản khác."));
        }

        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone().trim());
        user.setCitizenId(citizenId);
        user.setAddress(blankToNull(request.address()));
        user.setDateOfBirth(request.dateOfBirth());
        user.setRole(request.role());
        user.setWorkingProvince(workingProvinceOf(user, request));
        // Không cần save(): user đang được JPA quản lý trong transaction, tự ghi xuống DB khi hàm kết thúc.
        return AdminUserItem.from(user);
    }

    /**
     * Đặt lại mật khẩu cho người dùng quên mật khẩu mà không tự lấy lại được (ví dụ mất quyền vào email).
     * Admin phải nhập lại mật khẩu CỦA MÌNH; sai thì không đổi gì. Đúng thì sinh mật khẩu tạm ngẫu nhiên,
     * lưu bản băm, trả bản gốc về cho admin chuyển trực tiếp cho người dùng (chỉ thấy được lần này).
     */
    @Transactional
    public String resetPassword(String adminId, String userId, String adminPassword) {
        User admin = userRepository.getActiveById(adminId);
        if (!passwordEncoder.matches(adminPassword, admin.getPasswordHash())) {
            throw AppException.invalidFields(Map.of("adminPassword", "Mật khẩu không đúng."));
        }
        User user = findManageableUser(userId);
        if (user.getStatus() == User.Status.PENDING_OTP) {
            throw AppException.badRequest("Tài khoản chưa xác thực email, người dùng nên đăng ký lại.");
        }

        String temporaryPassword = generateTemporaryPassword();
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        // Gỡ khoá TẠM do nhập sai mật khẩu để người dùng đăng nhập được ngay.
        // Không đổi status: tài khoản bị admin khoá (LOCKED) vẫn phải mở khoá bằng nút riêng.
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        notifyPasswordReset(user);
        return temporaryPassword;
    }

    // ================================= HÀM PHỤ =================================

    /**
     * Khu vực tác nghiệp sau khi sửa tài khoản. Chỉ Cộng tác viên mới có; admin bỏ trống thì lấy khu vực
     * ghi trong đơn đăng ký CTV gần nhất (nếu có), để CTV mới được nâng cấp xuất hiện ngay ở đúng khu vực.
     */
    private String workingProvinceOf(User user, AdminUpdateUserRequest request) {
        if (request.role() != User.Role.CONTRIBUTOR) {
            return null;
        }
        String province = blankToNull(request.workingProvince());
        if (province != null && !VietnamProvinces.isValid(province)) {
            throw AppException.invalidFields(Map.of("workingProvince", "Tỉnh/thành phố không hợp lệ."));
        }
        if (province != null) {
            return province;
        }
        return applicationRepository.findByApplicantIdOrderByCreatedAtDescIdDesc(user.getId()).stream()
                .findFirst().map(ContributorApplication::getProvince).orElse(null);
    }

    /**
     * Mật khẩu tạm 12 ký tự, luôn có chữ HOA, chữ thường, số và ký tự đặc biệt (đạt quy tắc @StrongPassword).
     * SecureRandom: bộ sinh ngẫu nhiên an toàn, khó đoán hơn Random. Bỏ ký tự dễ nhầm 0/O, 1/l/I để người nhận gõ đúng.
     */
    private static String generateTemporaryPassword() {
        String[] groups = {"ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*"};
        String all = String.join("", groups);
        List<Character> chars = new ArrayList<>();
        for (String group : groups) {
            chars.add(group.charAt(RANDOM.nextInt(group.length()))); // Mỗi nhóm ít nhất 1 ký tự
        }
        while (chars.size() < 12) {
            chars.add(all.charAt(RANDOM.nextInt(all.length())));
        }
        Collections.shuffle(chars, RANDOM); // Trộn để ký tự bắt buộc không luôn nằm ở đầu
        StringBuilder password = new StringBuilder();
        chars.forEach(password::append);
        return password.toString();
    }

    /**
     * Báo cho người dùng biết mật khẩu vừa bị đặt lại (KHÔNG gửi mật khẩu). Nếu chính chủ vẫn dùng email
     * thì sẽ phát hiện được trường hợp người khác giả danh xin đặt lại. Gửi lỗi thì chỉ ghi log, không huỷ việc đặt lại.
     */
    private void notifyPasswordReset(User user) {
        String html = """
                <p>Xin chào %s,</p>
                <p>Mật khẩu tài khoản Tin Nóng Dân Sinh của bạn vừa được <strong>quản trị viên đặt lại</strong> theo yêu cầu hỗ trợ.</p>
                <p>Hãy đăng nhập bằng mật khẩu tạm được cung cấp và đổi mật khẩu ngay.
                Nếu bạn không yêu cầu việc này, vui lòng liên hệ toà soạn.</p>
                """.formatted(HtmlUtils.htmlEscape(user.getFullName()));
        try {
            mailService.send(user.getEmail(), "[Tin Nóng Dân Sinh] Mật khẩu của bạn đã được đặt lại", html);
        } catch (AppException ex) {
            log.warn("Cannot send password reset notice to {}", user.getId());
        }
    }

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
