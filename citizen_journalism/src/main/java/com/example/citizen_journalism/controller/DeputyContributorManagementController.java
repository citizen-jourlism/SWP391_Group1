
package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.service.DeputyContributorManagementService;
import com.example.citizen_journalism.service.DeputyContributorManagementService.ContributorItem;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * TungTT - Iteration 3 - Task 2.
 *
 * API chỉ đọc danh sách và hồ sơ CTV.
 *
 * Dùng /api/leadership/** đã được SecurityConfig bảo vệ.
 * Service kiểm tra thêm quyền DEPUTY_EIC.
 *
 * Không có API tạo/sửa/xóa Database.
 */
@RestController
@RequestMapping("/api/leadership/contributor-management")
@RequiredArgsConstructor
public class DeputyContributorManagementController {

    private final DeputyContributorManagementService service;

    /**
     * GET /api/leadership/contributor-management
     *
     * Ví dụ:
     * ?keyword=Nguyen&page=0&size=10
     */
    @GetMapping
    public ApiResponse<PageResponse<ContributorItem>> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.ok(
                "Danh sách Cộng tác viên.",
                service.list(
                        jwt.getSubject(),
                        keyword,
                        page,
                        size
                )
        );
    }

    /**
     * GET /api/leadership/contributor-management/{id}
     *
     * Xem thông tin một CTV.
     */
    @GetMapping("/{id}")
    public ApiResponse<ContributorItem> get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id
    ) {
        return ApiResponse.ok(
                "Thông tin Cộng tác viên.",
                service.get(jwt.getSubject(), id)
        );
    }
}
