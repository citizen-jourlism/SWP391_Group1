package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.submission.SubmissionHistoryResponse;
import com.example.citizen_journalism.service.SubmissionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API LỊCH SỬ CHỈNH SỬA hồ sơ của tôi (Người dân, Cộng tác viên, Chuyên gia; luật /api/submissions/** trong SecurityConfig).
 *
 *   GET /api/submissions/mine/{mã hồ sơ}/history -> các phiên bản của hồ sơ (bản gốc + mỗi lần bổ sung)
 *
 * Tách controller riêng (cùng tiền tố /api/submissions/mine với SubmissionController) để không phải sửa file chung.
 * Luồng: routes/SubmissionHistory.jsx -> services/historyService.js -> đây -> SubmissionHistoryService.
 */
@RestController
@RequestMapping("/api/submissions/mine")
@RequiredArgsConstructor
public class SubmissionHistoryController {

    private final SubmissionHistoryService historyService;

    @GetMapping("/{code}/history")
    public ApiResponse<SubmissionHistoryResponse> getHistory(@AuthenticationPrincipal Jwt jwt, @PathVariable String code) {
        return ApiResponse.ok("OK", historyService.getMine(jwt.getSubject(), code));
    }
}
