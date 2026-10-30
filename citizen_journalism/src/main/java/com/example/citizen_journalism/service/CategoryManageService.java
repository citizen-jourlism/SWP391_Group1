package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.CategoryItem;
import com.example.citizen_journalism.dto.editor.SaveCategoryRequest;
import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.CategoryManageRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryManageService {
    private final CategoryManageRepository categories;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public List<CategoryItem> list() {
        return categories.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream().map(this::map).toList();
    }

    @Transactional
    public CategoryItem create(SaveCategoryRequest request) {
        String slug = normalize(request.slug());
        verifySlug(slug, null);
        Category category = new Category();
        apply(category, request, slug);
        return map(save(category));
    }

    @Transactional
    public CategoryItem update(Long id, SaveCategoryRequest request) {
        Category category = get(id);
        String slug = normalize(request.slug());
        verifySlug(slug, id);
        apply(category, request, slug);
        return map(save(category));
    }

    @Transactional
    public CategoryItem setActive(Long id, boolean active) {
        Category category = get(id);
        category.setIsActive(active);
        return map(save(category));
    }

    private Category get(Long id) {
        return categories.findById(id)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy chuyên mục."));
    }

    private void verifySlug(String slug, Long currentId) {
        categories.findBySlugIgnoreCase(slug).ifPresent(found -> {
            if (!found.getId().equals(currentId)) {
                throw AppException.conflict("Slug đã được sử dụng.");
            }
        });
    }

    private void apply(Category category, SaveCategoryRequest request, String slug) {
        String name = request.name().trim();

        if (name.isEmpty() || slug.isEmpty()) {
            throw AppException.badRequest("Tên và slug không được để trống.");
        }

        if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            throw AppException.badRequest("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
        }

        category.setName(name);
        category.setSlug(slug);
        category.setIsActive(request.active());

        String deputyId = request.deputyEicId();

        if (deputyId == null || deputyId.isBlank()) {
            category.setDeputyEic(null);
        } else {
            User deputy = users.findById(deputyId.trim())
                    .orElseThrow(() -> AppException.badRequest("Không tìm thấy Phó Tổng biên tập."));

            if (deputy.getRole() != User.Role.DEPUTY_EIC) {
                throw AppException.badRequest("Người phụ trách phải có vai trò DEPUTY_EIC.");
            }

            category.setDeputyEic(deputy);
        }
    }

    private Category save(Category category) {
        try {
            return categories.saveAndFlush(category);
        } catch (DataIntegrityViolationException e) {
            throw AppException.conflict("Chuyên mục không hợp lệ hoặc slug đã tồn tại.");
        }
    }

    private String normalize(String text) {
        return text.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private CategoryItem map(Category category) {
        return new CategoryItem(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getDeputyEic() == null ? null : category.getDeputyEic().getId(),
                Boolean.TRUE.equals(category.getIsActive())
        );
    }
}