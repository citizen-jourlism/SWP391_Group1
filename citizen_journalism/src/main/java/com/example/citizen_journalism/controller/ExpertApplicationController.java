package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.*;
import com.example.citizen_journalism.service.ExpertApplicationService;
import com.example.citizen_journalism.service.ExpertApplicationService.*;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class ExpertApplicationController {
    private final ExpertApplicationService service;
    @GetMapping("/api/users/me/expert-applications")
    public ApiResponse<List<View>> mine(@AuthenticationPrincipal Jwt jwt) { return ApiResponse.ok("OK",service.mine(jwt.getSubject())); }
    @PostMapping("/api/users/me/expert-applications")
    public ApiResponse<View> apply(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Apply body) { return ApiResponse.ok("Đã gửi đơn.",service.apply(jwt.getSubject(),body)); }
    @GetMapping("/api/editor/expert-applications")
    public ApiResponse<PageResponse<View>> list(@RequestParam(required=false) String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size) { return ApiResponse.ok("OK",service.list(status,page,size)); }
    @PostMapping("/api/editor/expert-applications/{id}/review")
    public ApiResponse<View> review(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Review body) { return ApiResponse.ok("Đã xét đơn.",service.review(jwt.getSubject(),id,body)); }
}
