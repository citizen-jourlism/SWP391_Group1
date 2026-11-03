package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.violation.ViolationDetail;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.violation.ReviewAppealRequest;
import com.example.citizen_journalism.dto.violation.ViolationAppealView;
import com.example.citizen_journalism.entity.ViolationAppeal;
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
@RequestMapping("/api/editor")
@RequiredArgsConstructor
public class EditorAppealController {
    private final ViolationAppealService appealService;

    @GetMapping("/appeals")
    public ApiResponse<PageResponse<ViolationAppealView>> listAppeals(
            @RequestParam(required = false) ViolationAppeal.Status status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", appealService.list(status, keyword, page, size));
    }

    @GetMapping("/appeals/{id}")
    public ApiResponse<ViolationAppealView> getAppeal(@PathVariable Long id) {
        return ApiResponse.ok("OK", appealService.get(id));
    }

    @GetMapping("/appeals/{id}/penalties")
    public ApiResponse<PageResponse<ViolationDetail>> penalties(
            @PathVariable Long id, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", appealService.penalties(id, page, size));
    }

    @PostMapping("/appeals/{id}/review")
    public ApiResponse<ViolationAppealView> reviewAppeal(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                          @Valid @RequestBody ReviewAppealRequest request) {
        ViolationAppealView appeal = appealService.review(jwt.getSubject(), id, request);
        String message = request.decision() == ReviewAppealRequest.Decision.FORWARD
                ? "Đã chuyển khiếu nại đến bước phê duyệt cuối."
                : "Đã từ chối khiếu nại.";
        return ApiResponse.ok(message, appeal);
    }
}
