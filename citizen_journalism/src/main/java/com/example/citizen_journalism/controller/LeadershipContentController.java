package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.*;
import com.example.citizen_journalism.service.LeadershipContentService;
import com.example.citizen_journalism.service.LeadershipContentService.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/leadership/content")
public class LeadershipContentController {
    private final LeadershipContentService service;
    @GetMapping("/{kind}")
    public ApiResponse<PageResponse<Content>> list(@AuthenticationPrincipal Jwt jwt, @PathVariable String kind,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {
        return ApiResponse.ok("OK", service.list(jwt.getSubject(), kind, page, size));
    }
    @GetMapping("/{kind}/{id}")
    public ApiResponse<Content> get(@AuthenticationPrincipal Jwt jwt, @PathVariable String kind, @PathVariable Long id) {
        return ApiResponse.ok("OK", service.get(jwt.getSubject(), kind, id));
    }
    @PostMapping("/{kind}/{id}/decision")
    public ApiResponse<Content> decide(@AuthenticationPrincipal Jwt jwt, @PathVariable String kind, @PathVariable Long id,
            @Valid @RequestBody Decision request) {
        return ApiResponse.ok("Đã lưu quyết định duyệt nội dung.", service.decide(jwt.getSubject(), kind, id, request));
    }
}
