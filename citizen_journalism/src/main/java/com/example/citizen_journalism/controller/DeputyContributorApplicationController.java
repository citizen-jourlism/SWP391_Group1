
package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.deputy.DeputyReviewApplicationRequest;
import com.example.citizen_journalism.dto.editor.ApplicationListItem;
import com.example.citizen_journalism.dto.editor.EditorApplicationDetail;
import com.example.citizen_journalism.service.ContributorApplicationService;
import com.example.citizen_journalism.service.DeputyContributorApplicationService;
import com.example.citizen_journalism.util.FileResponses;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * TungTT - API xét duyệt đơn Contributor của Phó Tổng biên tập.
 *
 * Chỉ cho phép DEPUTY_EIC thực hiện.
 * Service kiểm tra role thực tế trong Database.
 *
 * Không xử lý nâng cấp User.role tại Controller này.
 */
@RestController
@RequestMapping("/api/deputy/contributor-applications")
@RequiredArgsConstructor
public class DeputyContributorApplicationController {

    private final DeputyContributorApplicationService deputyService;

    /**
     * Lấy danh sách đơn đang chờ Deputy EIC.
     *
     * GET /api/deputy/contributor-applications?page=0&size=10
     */
    @GetMapping
    public ApiResponse<PageResponse<ApplicationListItem>> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.ok(
                "OK",
                deputyService.list(jwt.getSubject(), page, size)
        );
    }

    /**
     * Lấy chi tiết đơn đăng ký.
     *
     * GET /api/deputy/contributor-applications/{id}
     */
    @GetMapping("/{id}")
    public ApiResponse<EditorApplicationDetail> get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        return ApiResponse.ok(
                "OK",
                deputyService.get(jwt.getSubject(), id)
        );
    }

    /**
     * Phó Tổng biên tập xem giấy tờ người đăng ký.
     *
     * Không trả đường dẫn lưu trữ nội bộ.
     * Tệp được trả về sau khi xác minh quyền truy cập.
     */
    @GetMapping("/{id}/documents/{index}")
    public ResponseEntity<Resource> openDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @PathVariable int index
    ) {
        ContributorApplicationService.DocumentFile file =
                deputyService.openDocument(
                        jwt.getSubject(),
                        id,
                        index
                );

        return FileResponses.inline(file);
    }

    /**
     * Phó Tổng biên tập phê duyệt hoặc từ chối cuối.
     *
     * POST /api/deputy/contributor-applications/{id}/review
     *
     * APPROVE -> APPROVED
     * REJECT  -> REJECTED
     */
    @PostMapping("/{id}/review")
    public ApiResponse<EditorApplicationDetail> review(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody DeputyReviewApplicationRequest request
    ) {
        boolean rejected =
                request.decision()
                        == DeputyReviewApplicationRequest.Decision.REJECT;

        String message = rejected
                ? "Đã từ chối đơn đăng ký cộng tác viên."
                : "Đã phê duyệt đơn. Tài khoản chờ System Admin kích hoạt.";

        return ApiResponse.ok(
                message,
                deputyService.review(
                        jwt.getSubject(),
                        id,
                        request
                )
        );
    }
}
