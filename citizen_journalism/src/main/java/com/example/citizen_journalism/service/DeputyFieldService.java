package com.example.citizen_journalism.service;

import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.CategoryManageRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * LĨNH VỰC PHỤ TRÁCH của Phó Tổng biên tập.
 * Luồng: CreateUserDialog.jsx (admin chọn vai trò Phó TBT) -> adminService.getDeputyFields / createUser
 *        -> DeputyFieldController (GET danh sách) / AdminController.createUser -> AdminService.createUser -> assign().
 *
 * Không có bảng riêng: "lĩnh vực" chính là 1 chuyên mục ở bảng categories, Phó TBT phụ trách lưu ở cột
 * categories.deputy_eic_id. 1 Phó TBT đứng tên được nhiều chuyên mục, mỗi chuyên mục chỉ có 1 Phó TBT.
 * Tên chuyên mục trùng lĩnh vực Chuyên gia chọn khi viết bài, nên bài nghiên cứu chỉ tới đúng Phó TBT phụ trách
 * (ResearchEditorialService.findDeputy khi BTV duyệt, LeadershipService khi lọc Bàn duyệt).
 */
@Service
@RequiredArgsConstructor
public class DeputyFieldService {

    private final CategoryManageRepository categoryRepository;

    /** 1 lựa chọn lĩnh vực ở form tạo tài khoản. deputyId / deputyName: người đang phụ trách (null = chưa có). */
    public record FieldOption(Long id, String name, String deputyId, String deputyName) {
    }

    /** Các chuyên mục ĐANG BẬT trong DB (theo tên A–Z), kèm Phó TBT đang phụ trách. */
    @Transactional(readOnly = true)
    public List<FieldOption> listActive() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .filter(category -> Boolean.TRUE.equals(category.getIsActive()))
                .map(category -> {
                    User deputy = category.getDeputyEic();
                    return new FieldOption(category.getId(), category.getName(),
                            deputy == null ? null : deputy.getId(), deputy == null ? null : deputy.getFullName());
                })
                .toList();
    }

    /**
     * Giao các chuyên mục cho Phó TBT vừa tạo. Chuyên mục đã có người khác phụ trách thì CHUYỂN sang người mới.
     * Chạy chung transaction với AdminService.createUser: lĩnh vực sai -> ném lỗi -> tài khoản cũng không được tạo.
     */
    @Transactional
    public void assign(User deputy, List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            throw AppException.invalidFields(Map.of("categoryIds", "Vui lòng chọn ít nhất 1 lĩnh vực phụ trách."));
        }
        List<Long> ids = categoryIds.stream().distinct().toList();
        List<Category> categories = categoryRepository.findAllById(ids);
        // Thiếu chuyên mục (id không tồn tại) hoặc có chuyên mục đã tắt -> admin cần tải lại danh sách
        if (categories.size() != ids.size() || categories.stream().anyMatch(c -> !Boolean.TRUE.equals(c.getIsActive()))) {
            throw AppException.invalidFields(Map.of("categoryIds",
                    "Có lĩnh vực không tồn tại hoặc đã ngừng hoạt động. Vui lòng tải lại trang và chọn lại."));
        }
        // Chuyên mục đang được JPA quản lý -> đổi trường là đủ, hết transaction tự ghi xuống DB
        categories.forEach(category -> category.setDeputyEic(deputy));
    }

    /**
     * Admin SỬA tài khoản (AdminService.updateUser, sau khi đã đổi vai trò):
     *   - Vẫn / trở thành Phó TBT: giao các chuyên mục đã chọn (≥ 1), chuyên mục người này đang giữ mà bị bỏ chọn -> trống.
     *   - Vai trò khác (ví dụ đổi Phó TBT -> BTV): gỡ mọi chuyên mục người này đang đứng tên.
     * Lỗi -> ném invalidFields, transaction của updateUser huỷ luôn các thay đổi khác.
     */
    @Transactional
    public void sync(User user, List<Long> categoryIds) {
        boolean deputy = user.getRole() == User.Role.DEPUTY_EIC;
        if (deputy) {
            assign(user, categoryIds); // kiểm tra + giao trước, lỗi thì chưa gỡ gì
        }
        List<Long> keep = deputy ? categoryIds : List.of();
        // Bảng categories rất nhỏ (vài chục dòng) nên lọc trong Java, không cần thêm câu truy vấn
        categoryRepository.findAll().stream()
                .filter(category -> category.getDeputyEic() != null && user.getId().equals(category.getDeputyEic().getId()))
                .filter(category -> !keep.contains(category.getId()))
                .forEach(category -> category.setDeputyEic(null));
    }
}
