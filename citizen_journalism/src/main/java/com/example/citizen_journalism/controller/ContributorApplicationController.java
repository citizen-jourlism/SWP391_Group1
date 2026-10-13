package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.contributor.ApplicationView;
import com.example.citizen_journalism.dto.contributor.ApplyContributorRequest;
import com.example.citizen_journalism.dto.contributor.ContributorOverview;
import com.example.citizen_journalism.service.ContributorApplicationService;
import com.example.citizen_journalism.util.FileResponses;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API ĐĂNG KÝ + THEO DÕI ĐƠN CỘNG TÁC VIÊN của người đang đăng nhập (SRS: Register as a Contributor,
 * Track Contributor Application). Người dân và CTV gọi được (SecurityConfig); chỉ người dân mới nộp được đơn
 * (service kiểm tra điều kiện). Mọi thao tác chỉ trên đơn CỦA CHÍNH MÌNH (mã người dùng lấy từ token).
 *
 *   GET  /api/contributor-applications/me                       -> điều kiện + đơn hiện tại + lịch sử + dữ liệu form
 *   POST /api/contributor-applications                          -> nộp đơn (multipart: "data" JSON + "files" giấy tờ)
 *   POST /api/contributor-applications/{id}/withdraw            -> rút đơn (khi Biên tập viên chưa xét)
 *   GET  /api/contributor-applications/{id}/documents/{index}   -> xem lại giấy tờ đã nộp
 */
@RestController
@RequestMapping("/api/contributor-applications")
@RequiredArgsConstructor
public class ContributorApplicationController {

    private final ContributorApplicationService applicationService;

    @GetMapping("/me")
    public ApiResponse<ContributorOverview> getOverview(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("OK", applicationService.getOverview(jwt.getSubject()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ApplicationView> apply(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestPart("data") ApplyContributorRequest request,
                                              @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok("Đã nộp đơn đăng ký Cộng tác viên!", applicationService.apply(jwt.getSubject(), request, files));
    }

    @PostMapping("/{id}/withdraw")
    public ApiResponse<ApplicationView> withdraw(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("Đã rút đơn đăng ký.", applicationService.withdraw(jwt.getSubject(), id));
    }

    /** Trả về chính tệp (ảnh / PDF), không bọc trong ApiResponse. */
    @GetMapping("/{id}/documents/{index}")
    public ResponseEntity<Resource> openDocument(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                 @PathVariable int index) {
        return FileResponses.inline(applicationService.openMyDocument(jwt.getSubject(), id, index));
    }
}
