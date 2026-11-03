
package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.service.ExpertUpgradeService;
import com.example.citizen_journalism.service.ExpertUpgradeService.ExpertApplication;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * TungTT - Iteration 3 - Task 3.
 *
 * API:
 * - Citizen: nộp và theo dõi đơn Expert
 * - Editor: xét duyệt bước 1
 * - Deputy EIC: xét duyệt cuối
 *
 * Phân quyền được kiểm tra trong Service.
 */
@RestController
@RequestMapping("/api/expert-upgrade")
@RequiredArgsConstructor
public class ExpertUpgradeController {

    private final ExpertUpgradeService service;

    public record ReviewRequest(
            boolean approved,
            String note
    ) {}

    /**
     * Citizen nộp đơn bằng multipart/form-data.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ExpertApplication> apply(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String expertise,
            @RequestParam String qualification,
            @RequestParam(required = false) String experience,
            @RequestParam("files") List<MultipartFile> files
    ) {
        return ApiResponse.ok(
                "Đã gửi đơn đăng ký Chuyên gia.",
                service.apply(
                        jwt.getSubject(),
                        expertise,
                        qualification,
                        experience,
                        files
                )
        );
    }

    /**
     * Citizen theo dõi đơn của chính mình.
     */
    @GetMapping("/me")
    public ApiResponse<List<ExpertApplication>> mine(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.ok(
                "Lịch sử đăng ký Chuyên gia.",
                service.mine(jwt.getSubject())
        );
    }

    /**
     * Editor xem đơn đang chờ duyệt.
     */
    @GetMapping("/editor")
    public ApiResponse<List<ExpertApplication>> editorQueue(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.ok(
                "Danh sách đơn Expert chờ Editor.",
                service.queue(jwt.getSubject(), User.Role.EDITOR)
        );
    }

    /**
     * Editor chấp thuận chuyển tiếp hoặc từ chối.
     */
    @PostMapping("/editor/{id}/review")
    public ApiResponse<ExpertApplication> editorReview(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id,
            @RequestBody ReviewRequest request
    ) {
        return ApiResponse.ok(
                "Đã xử lý đơn Expert.",
                service.editorReview(
                        jwt.getSubject(),
                        id,
                        request.approved(),
                        request.note()
                )
        );
    }

    /**
     * Deputy EIC xem đơn chờ duyệt cuối.
     */
    @GetMapping("/deputy")
    public ApiResponse<List<ExpertApplication>> deputyQueue(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.ok(
                "Danh sách đơn Expert chờ Deputy.",
                service.queue(jwt.getSubject(), User.Role.DEPUTY_EIC)
        );
    }

    /**
     * Deputy EIC duyệt cuối.
     */
    @PostMapping("/deputy/{id}/review")
    public ApiResponse<ExpertApplication> deputyReview(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id,
            @RequestBody ReviewRequest request
    ) {
        return ApiResponse.ok(
                "Đã xử lý xét duyệt cuối đơn Expert.",
                service.deputyReview(
                        jwt.getSubject(),
                        id,
                        request.approved(),
                        request.note()
                )
        );
    }

    /**
     * Xem tài liệu thông qua API có kiểm tra quyền.
     * Không mở trực tiếp đường dẫn uploads.
     */
    @GetMapping("/{id}/documents/{index}")
    public ResponseEntity<Resource> document(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id,
            @PathVariable int index
    ) {
        Resource resource = service.document(
                jwt.getSubject(), id, index
        );

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment"
                )
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(resource);
    }
}
