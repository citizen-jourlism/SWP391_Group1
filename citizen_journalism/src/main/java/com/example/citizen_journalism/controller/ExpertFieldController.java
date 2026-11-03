
package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.repository.CategoryManageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * TungTT - Iteration 3 - Task 3.
 * Lấy lĩnh vực chuyên môn từ bảng categories.
 * Chỉ đọc, không thay đổi Database.
 */
@RestController
@RequestMapping("/api/expert-upgrade/fields")
@RequiredArgsConstructor
public class ExpertFieldController {

    private final CategoryManageRepository categoryRepository;

    public record FieldOption(Long id, String name) {}

    @GetMapping
    public ApiResponse<List<FieldOption>> list() {
        List<FieldOption> fields = categoryRepository
                .findAll(Sort.by("name"))
                .stream()
                .filter(category ->
                        Boolean.TRUE.equals(category.getIsActive()))
                .map(category ->
                        new FieldOption(
                                category.getId(),
                                category.getName()
                        ))
                .toList();

        return ApiResponse.ok("Danh sách lĩnh vực chuyên môn.", fields);
    }
}
