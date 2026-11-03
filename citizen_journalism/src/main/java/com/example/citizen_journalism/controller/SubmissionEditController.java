package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.service.SubmissionEditService;
import com.example.citizen_journalism.service.SubmissionEditService.ContentBody;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Biên tập viên sửa trực tiếp nội dung hồ sơ (không cần người gửi xác nhận). Nghiệp vụ: SubmissionEditService.
 * Nằm dưới /api/editor/** nên SecurityConfig đã giới hạn chỉ EDITOR.
 *   PUT /api/editor/submissions/{mã}/content   body { title, summary, content } -> chi tiết hồ sơ sau khi sửa
 */
@RestController
@RequiredArgsConstructor
public class SubmissionEditController {

    private final SubmissionEditService service;

    @PutMapping("/api/editor/submissions/{code}/content")
    public ApiResponse<SubmissionDetail> edit(@AuthenticationPrincipal Jwt jwt, @PathVariable String code,
                                              @Valid @RequestBody ContentBody body) {
        return ApiResponse.ok("Đã lưu nội dung đã biên tập.", service.edit(jwt.getSubject(), code, body));
    }
}
