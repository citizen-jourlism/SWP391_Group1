package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.*;
import com.example.citizen_journalism.dto.violation.*;
import com.example.citizen_journalism.entity.UserViolation;
import com.example.citizen_journalism.service.UserViolationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class UserViolationController {
    private final UserViolationService service;

    @GetMapping("/api/editor/violations")
    public ApiResponse<PageResponse<ViolationSummary>> list(
            @RequestParam(required=false) UserViolation.Status status,
            @RequestParam(required=false) UserViolation.Type type,
            @RequestParam(required=false) UserViolation.Action action,
            @RequestParam(required=false) String keyword,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {
        return ApiResponse.ok("OK", service.list(status, type, action, keyword, page, size));
    }
    @PostMapping("/api/editor/violations")
    public ApiResponse<ViolationDetail> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateViolationRequest request) {
        return ApiResponse.ok("Đã lập báo cáo vi phạm.", service.create(jwt.getSubject(), request));
    }
    @GetMapping({"/api/editor/violations/{id}", "/api/leadership/violations/{id}"})
    public ApiResponse<ViolationDetail> get(@PathVariable Long id) {
        return ApiResponse.ok("OK", service.get(id));
    }
    @PostMapping("/api/editor/violations/{id}/review")
    public ApiResponse<ViolationDetail> review(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody ReviewViolationRequest request) {
        return ApiResponse.ok("Đã xử lý báo cáo.", service.review(jwt.getSubject(), id, request));
    }
    @GetMapping("/api/leadership/violations")
    public ApiResponse<PageResponse<ViolationSummary>> approvals(
            @RequestParam(required=false) UserViolation.Status status,
            @RequestParam(required=false) UserViolation.Action action,
            @RequestParam(required=false) String keyword,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {
        return ApiResponse.ok("OK", service.listForLeadership(status, action, keyword, page, size));
    }
    @PostMapping("/api/leadership/violations/{id}/decision")
    public ApiResponse<ViolationDetail> decide(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody ApproveViolationRequest request) {
        return ApiResponse.ok("Đã lưu quyết định.", service.approve(jwt.getSubject(), id, request));
    }
}
