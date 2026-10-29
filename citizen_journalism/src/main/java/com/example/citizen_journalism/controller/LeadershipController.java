package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.violation.DecideAppealRequest;
import com.example.citizen_journalism.dto.violation.ViolationAppealView;
import com.example.citizen_journalism.service.ViolationAppealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leadership")
@RequiredArgsConstructor
public class LeadershipController {

    private final ViolationAppealService appealService;

    @GetMapping("/appeals")
    public ApiResponse<PageResponse<ViolationAppealView>> listAppeals(
            @RequestParam(required = false) com.example.citizen_journalism.entity.ViolationAppeal.Status status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", appealService.list(status, keyword, page, size));
    }

    @GetMapping("/appeals/{id}")
    public ApiResponse<ViolationAppealView> getAppeal(@PathVariable Long id) {
        return ApiResponse.ok("OK", appealService.get(id));
    }

    @PostMapping("/appeals/{id}/decision")
    public ApiResponse<ViolationAppealView> decideAppeal(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                          @Valid @RequestBody DecideAppealRequest request) {
        ViolationAppealView appeal = appealService.decide(jwt.getSubject(), id, request);
        String message = request.decision() == DecideAppealRequest.Decision.APPROVE
                ? "Đã duyệt khiếu nại và mở khóa tài khoản."
                : "Đã từ chối khiếu nại.";
        return ApiResponse.ok(message, appeal);
    }
}
