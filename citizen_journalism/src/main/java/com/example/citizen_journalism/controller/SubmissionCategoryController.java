package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.editor.ClassifySubmissionRequest;
import com.example.citizen_journalism.dto.editor.SubmissionCategoryResponse;
import com.example.citizen_journalism.service.SubmissionCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * API PHÂN LOẠI TIN của Biên tập viên (SecurityConfig: /api/editor/** chỉ EDITOR).
 * Tách khỏi EditorController để chức năng này không đụng file chung của bàn làm việc.
 *
 *   GET /api/editor/submissions/{mã}/category  -> chuyên mục hiện tại + danh sách chuyên mục để chọn
 *   PUT /api/editor/submissions/{mã}/category  -> phân loại / đổi chuyên mục { categoryId }
 */
@RestController
@RequiredArgsConstructor
public class SubmissionCategoryController {

    private final SubmissionCategoryService categoryService;

    @GetMapping("/api/editor/submissions/{trackingCode}/category")
    public ApiResponse<SubmissionCategoryResponse> get(@PathVariable String trackingCode) {
        return ApiResponse.ok("OK", categoryService.get(trackingCode));
    }

    @PutMapping("/api/editor/submissions/{trackingCode}/category")
    public ApiResponse<SubmissionCategoryResponse> classify(@AuthenticationPrincipal Jwt jwt, @PathVariable String trackingCode,
                                                           @Valid @RequestBody ClassifySubmissionRequest request) {
        SubmissionCategoryResponse result = categoryService.classify(jwt.getSubject(), trackingCode, request);
        return ApiResponse.ok("Đã phân loại hồ sơ vào chuyên mục \"" + result.categoryName() + "\".", result);
    }
}
