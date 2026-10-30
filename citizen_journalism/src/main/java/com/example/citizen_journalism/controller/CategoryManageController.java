package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.editor.CategoryItem;
import com.example.citizen_journalism.dto.editor.SaveCategoryRequest;
import com.example.citizen_journalism.service.CategoryManageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/editor/categories")
@RequiredArgsConstructor
public class CategoryManageController {
    private final CategoryManageService service;

    @GetMapping
    public ApiResponse<List<CategoryItem>> list() {
        return ApiResponse.ok("OK", service.list());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryItem> create(@Valid @RequestBody SaveCategoryRequest request) {
        return ApiResponse.ok("Đã thêm chuyên mục.", service.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryItem> update(
            @PathVariable Long id,
            @Valid @RequestBody SaveCategoryRequest request) {
        return ApiResponse.ok("Đã cập nhật chuyên mục.", service.update(id, request));
    }

    public record ActiveRequest(@NotNull Boolean active) {}

    @PatchMapping("/{id}/active")
    public ApiResponse<CategoryItem> setActive(
            @PathVariable Long id,
            @Valid @RequestBody ActiveRequest request) {
        return ApiResponse.ok(
                "Đã đổi trạng thái chuyên mục.",
                service.setActive(id, request.active())
        );
    }
}