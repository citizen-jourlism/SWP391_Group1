package com.example.citizen_journalism.service;

// "import static": gọi thẳng blankToNull(...) thay vì TextUtils.blankToNull(...) cho gọn.
// blankToNull: chuỗi rỗng -> null, để DB lưu NULL (và 2 người cùng bỏ trống CCCD không bị coi là trùng nhau).
import static com.example.citizen_journalism.util.TextUtils.blankToNull;
import static com.example.citizen_journalism.util.TextUtils.normalizeEmail;

import com.example.citizen_journalism.dto.auth.OtpInfo;
import com.example.citizen_journalism.dto.user.UpdateProfileRequest;
import com.example.citizen_journalism.dto.user.UserProfile;
import com.example.citizen_journalism.entity.OtpToken;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Nghiệp vụ HỒ SƠ CÁ NHÂN của người đang đăng nhập (trang /account/profile ở frontend).
 * Được UserController gọi; userId luôn lấy từ token đăng nhập, nên mỗi người chỉ sửa được hồ sơ CỦA MÌNH.
 *
 * Gồm 3 nhóm:
 *   1. Xem / sửa thông tin: họ tên, SĐT, CCCD, địa chỉ, ngày sinh.
 *   2. Đổi email: gửi OTP tới EMAIL MỚI, nhập đúng mã mới đổi (tránh gõ nhầm email rồi mất tài khoản,
 *      vì email dùng để đăng nhập). Dùng lại OtpService với mục đích CHANGE_EMAIL.
 *   3. Ảnh đại diện: lưu file vào thư mục uploads/avatars qua FileStorageService.
 * Điểm uy tín và điểm thưởng KHÔNG sửa được ở đây (chỉ hệ thống thay đổi).
 */
@Service
@RequiredArgsConstructor
public class UserService {

    /** Ảnh đại diện tối đa 2MB. */
    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final String AVATAR_FOLDER = "avatars";

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final FileStorageService fileStorageService;

    // ============================ 1. XEM / SỬA THÔNG TIN ============================

    @Transactional(readOnly = true)
    public UserProfile getProfile(String userId) {
        return UserProfile.from(userRepository.getActiveById(userId));
    }

    @Transactional
    public UserProfile updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.getActiveById(userId);

        String citizenId = blankToNull(request.citizenId());
        if (citizenId != null && userRepository.existsByCitizenIdAndIdNot(citizenId, userId)) {
            throw AppException.conflict("Số CCCD này đã được đăng ký cho một tài khoản khác.");
        }

        user.setFullName(request.fullName().trim());
        user.setPhone(request.phone().trim());
        user.setCitizenId(citizenId);
        user.setAddress(blankToNull(request.address()));
        user.setDateOfBirth(request.dateOfBirth());
        // Không cần save(): user đang được JPA quản lý trong transaction, tự ghi xuống DB khi hàm kết thúc.
        return UserProfile.from(user);
    }

    // ================================ 2. ĐỔI EMAIL ================================

    /** Bước 1: kiểm tra email mới hợp lệ rồi gửi OTP tới email MỚI (lưu email mới vào payload của mã). */
    @Transactional
    public OtpInfo requestEmailChange(String userId, String newEmail) {
        User user = userRepository.getActiveById(userId);
        String email = normalizeEmail(newEmail);
        if (email.equals(user.getEmail())) {
            throw AppException.badRequest("Email mới phải khác email hiện tại.");
        }
        if (userRepository.existsByEmail(email)) {
            throw AppException.conflict("Email này đã được sử dụng bởi một tài khoản khác.");
        }
        return otpService.issue(user, OtpToken.Purpose.CHANGE_EMAIL, email, email);
    }

    /**
     * Bước 2: nhập đúng mã -> đổi sang email mới (đọc từ payload của mã).
     * Kiểm tra trùng email thêm một lần nữa, phòng trường hợp trong lúc chờ nhập mã có người khác vừa đăng ký email đó.
     * noRollbackFor: giữ lại số lần nhập sai OTP khi ném lỗi (giống AuthService).
     */
    @Transactional(noRollbackFor = AppException.class)
    public UserProfile verifyEmailChange(String userId, String otp) {
        User user = userRepository.getActiveById(userId);
        String newEmail = otpService.verify(user, OtpToken.Purpose.CHANGE_EMAIL, otp).getPayload();
        if (userRepository.existsByEmail(newEmail)) {
            throw AppException.conflict("Email này đã được sử dụng bởi một tài khoản khác.");
        }
        user.setEmail(newEmail);
        return UserProfile.from(user);
    }

    // ============================== 3. ẢNH ĐẠI DIỆN ==============================

    /** Lưu ảnh mới, cập nhật đường dẫn trong DB, rồi xoá file ảnh cũ để không chiếm chỗ. */
    @Transactional
    public UserProfile updateAvatar(String userId, MultipartFile file) {
        User user = userRepository.getActiveById(userId);
        String newUrl = fileStorageService.store(file, AVATAR_FOLDER, user.getId(),
                FileStorageService.IMAGE_TYPES, MAX_AVATAR_BYTES);
        String oldUrl = user.getAvatarUrl();
        user.setAvatarUrl(newUrl);
        fileStorageService.delete(oldUrl);
        return UserProfile.from(user);
    }

    /** Xoá ảnh đại diện (quay về hiển thị chữ cái đầu của tên). */
    @Transactional
    public UserProfile removeAvatar(String userId) {
        User user = userRepository.getActiveById(userId);
        fileStorageService.delete(user.getAvatarUrl());
        user.setAvatarUrl(null);
        return UserProfile.from(user);
    }
}
