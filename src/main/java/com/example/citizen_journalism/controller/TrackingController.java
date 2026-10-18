package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.TrackRequest;
import com.example.citizen_journalism.service.SubmissionTrackingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API TRA CỨU HỒ SƠ bằng mã hồ sơ + mã PIN — CÔNG KHAI, không cần đăng nhập (nằm trong PUBLIC_ENDPOINTS của SecurityConfig).
 *
 *   POST /api/tracking   body { "trackingCode": "KB-2026-0001", "pin": "123456" }  -> SubmissionDetail
 *
 * TẠI SAO tách khỏi SubmissionController? Mọi API trong /api/submissions/** đều bắt buộc đăng nhập đúng vai trò,
 * còn tra cứu thì ai có mã + PIN cũng dùng được (ví dụ người gửi ẩn danh, đang dùng máy khác).
 * Dùng POST (không phải GET) để mã PIN nằm trong body, không hiện trên đường dẫn.
 */
@RestController
@RequestMapping("/api/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final SubmissionTrackingService trackingService;

    @PostMapping
    public ApiResponse<SubmissionDetail> track(@Valid @RequestBody TrackRequest request) {
        return ApiResponse.ok("OK", trackingService.track(request));
    }
}
