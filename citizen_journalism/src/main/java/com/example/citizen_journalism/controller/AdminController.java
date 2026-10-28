package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.admin.AdminStats;
import com.example.citizen_journalism.dto.admin.AdminUserItem;
import com.example.citizen_journalism.dto.admin.CreateUserRequest;
import com.example.citizen_journalism.dto.admin.UpdateRoleRequest;
import com.example.citizen_journalism.dto.admin.UpdateStatusRequest;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * API QUẢN TRỊ HỆ THỐNG. CHỈ tài khoản SYSTEM_ADMIN gọi được:
 * SecurityConfig có luật .requestMatchers("/api/admin/**").hasRole("SYSTEM_ADMIN");
 * người khác gọi sẽ nhận 403 "Bạn không có quyền...".
 *
 *   GET   /api/admin/stats                 -> số liệu tổng quan cho Dashboard
 *   GET   /api/admin/users?keyword=&role=&status=&page=0&size=10   -> danh sách có tìm kiếm, lọc, phân trang
 *   POST  /api/admin/users                 -> tạo tài khoản nội bộ
 *   PATCH /api/admin/users/{id}/status     -> khoá / mở khoá
 *   PATCH /api/admin/users/{id}/role       -> đổi vai trò
 * PATCH: cập nhật MỘT PHẦN của tài khoản (chỉ trạng thái, hoặc chỉ vai trò).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    @GetMapping("/stats")
    public ApiResponse<AdminStats> stats() {
        return ApiResponse.ok("OK", adminService.getStats());
    }

    /** @RequestParam(required = false): tham số không bắt buộc, không gửi thì nhận null (= không lọc). */
    @GetMapping("/users")
    public ApiResponse<PageResponse<AdminUserItem>> users(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) User.Role role,
            @RequestParam(required = false) User.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", adminService.searchUsers(keyword, role, status, page, size));
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminUserItem> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.ok("Đã tạo tài khoản " + request.email() + ".", adminService.createUser(request));
    }

    @PatchMapping("/users/{id}/status")
    public ApiResponse<AdminUserItem> updateStatus(@PathVariable String id, @Valid @RequestBody UpdateStatusRequest request) {
        AdminUserItem user = adminService.updateStatus(id, request.status());
        String action = user.status() == User.Status.LOCKED ? "Đã khoá" : "Đã mở khoá";
        return ApiResponse.ok(action + " tài khoản " + user.fullName() + ".", user);
    }

    @PatchMapping("/users/{id}/role")
    public ApiResponse<AdminUserItem> updateRole(@PathVariable String id, @Valid @RequestBody UpdateRoleRequest request) {
        AdminUserItem user = adminService.updateRole(id, request.role());
        return ApiResponse.ok("Đã đổi vai trò của " + user.fullName() + ".", user);
    }

}
