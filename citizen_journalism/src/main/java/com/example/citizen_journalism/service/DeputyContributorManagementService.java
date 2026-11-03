
package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.UserRepository;

import java.time.LocalDateTime;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TungTT - Iteration 3 - Task 2.
 *
 * Đọc và tra cứu danh sách Cộng tác viên.
 * Không thay đổi User, Entity, Database hay dữ liệu của nhóm.
 */
@Service
@RequiredArgsConstructor
public class DeputyContributorManagementService {

    private final UserRepository userRepository;

    /**
     * DTO chỉ chứa những thông tin cần hiển thị.
     * Tuyệt đối không trả passwordHash, CCCD hoặc tài liệu riêng tư.
     */
    public record ContributorItem(
            String id,
            String fullName,
            String email,
            String phone,
            User.Status status,
            Integer reputationScore,
            Integer performanceScore,
            String province,
            LocalDateTime createdAt
    ) {
        public static ContributorItem from(User user) {
            return new ContributorItem(
                    user.getId(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getPhone(),
                    user.getStatus(),
                    user.getReputationScore(),
                    user.getPerformanceScore(),
                    user.getProvince(),
                    user.getCreatedAt()
            );
        }
    }

    /**
     * Chỉ Phó Tổng Biên tập được sử dụng chức năng.
     */
    private void requireDeputy(String deputyId) {
        User deputy = userRepository.getActiveById(deputyId);

        if (deputy.getRole() != User.Role.DEPUTY_EIC) {
            throw AppException.forbidden(
                    "Chỉ Phó Tổng Biên tập được quản lý Cộng tác viên.",
                    "DEPUTY_ROLE_REQUIRED"
            );
        }
    }

    /**
     * Tìm danh sách CTV bằng UserRepository.search() có sẵn.
     *
     * - Lọc role CONTRIBUTOR tại Backend.
     * - Tìm theo tên, email hoặc mã tài khoản.
     * - Có phân trang để tránh tải toàn bộ người dùng.
     * - Chỉ đọc Database.
     */
    @Transactional(readOnly = true)
    public PageResponse<ContributorItem> list(
            String deputyId,
            String keyword,
            int page,
            int size
    ) {
        requireDeputy(deputyId);

        if (page < 0 || size < 1 || size > 100) {
            throw AppException.badRequest(
                    "Trang hoặc số lượng bản ghi không hợp lệ."
            );
        }

        String search = keyword == null
                ? null
                : keyword.trim();

        if (search != null && search.isEmpty()) {
            search = null;
        }

        if (search != null && search.length() > 100) {
            throw AppException.badRequest(
                    "Từ khóa tìm kiếm tối đa 100 ký tự."
            );
        }

        // Tái sử dụng repository chung, không chỉnh sửa repository.
        var contributors = userRepository.search(
                search,
                User.Role.CONTRIBUTOR,
                null,
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Direction.DESC,
                                "createdAt"
                        )
                )
        );

        return PageResponse.from(
                contributors.map(ContributorItem::from)
        );
    }

    /**
     * Xem một CTV.
     * Không được xem người có vai trò khác.
     */
    @Transactional(readOnly = true)
    public ContributorItem get(
            String deputyId,
            String contributorId
    ) {
        requireDeputy(deputyId);

        User contributor = userRepository.findById(contributorId)
                .filter(user ->
                        user.getRole() == User.Role.CONTRIBUTOR
                )
                .orElseThrow(() ->
                        AppException.notFound(
                                "Không tìm thấy Cộng tác viên."
                        )
                );

        return ContributorItem.from(contributor);
    }
}
