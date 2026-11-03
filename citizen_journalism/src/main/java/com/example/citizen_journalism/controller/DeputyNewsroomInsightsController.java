
package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.service.DeputyNewsroomInsightsService;
import com.example.citizen_journalism.service.DeputyNewsroomInsightsService.Dashboard;
import com.example.citizen_journalism.service.DeputyNewsroomInsightsService.Period;
import com.example.citizen_journalism.service.DeputyNewsroomInsightsService.StaffDirectory;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * TungTT - Iteration 3 - Tasks 4 & 5.
 * Hai API chỉ đọc, không thay đổi Database.
 */
@RestController
@RequestMapping("/api/leadership/insights")
@RequiredArgsConstructor
public class DeputyNewsroomInsightsController {

    private final DeputyNewsroomInsightsService service;

    // GET /api/leadership/insights/dashboard?period=WEEK
    @GetMapping("/dashboard")
    public ApiResponse<Dashboard> dashboard(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "WEEK") Period period
    ) {
        return ApiResponse.ok(
                "Thống kê hiệu suất tòa soạn.",
                service.dashboard(jwt.getSubject(), period)
        );
    }

    // GET /api/leadership/insights/staff?keyword=...
    @GetMapping("/staff")
    public ApiResponse<StaffDirectory> staff(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String keyword
    ) {
        return ApiResponse.ok(
                "Danh bạ nhân sự biên tập.",
                service.directory(jwt.getSubject(), keyword)
        );
    }
}
