package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.submission.CreateSubmissionRequest;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.SubmissionFormOptions;
import com.example.citizen_journalism.dto.submission.SubmissionReceipt;
import com.example.citizen_journalism.dto.submission.SubmissionSummary;
import com.example.citizen_journalism.service.SubmissionService;
import com.example.citizen_journalism.service.SubmissionTrackingService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API GỬI TIN / KHIẾU NẠI của người dân. Chỉ CITIZEN, CONTRIBUTOR, EXPERT được gọi (luật trong SecurityConfig).
 *
 *   GET  /api/submissions/options -> danh sách tỉnh/thành + giới hạn tệp cho form
 *   POST /api/submissions         -> gửi form (multipart/form-data, gồm 2 phần):
 *                                      - "data" : JSON các ô chữ (CreateSubmissionRequest)
 *                                      - "files": các tệp tư liệu (1..10 tệp)
 *   GET  /api/submissions/mine?page=&size=  -> danh sách "Hồ sơ đã gửi" của tôi (mới nhất trước)
 *   GET  /api/submissions/mine/{mã hồ sơ}   -> chi tiết + nhật ký xử lý 1 hồ sơ của tôi (không cần PIN)
 *
 * TẠI SAO multipart mà không phải JSON? JSON không chở được file; multipart cho phép gửi
 * chữ + nhiều file trong CÙNG một request -> hồ sơ và tư liệu được lưu cùng lúc, không bị "nửa vời".
 */
@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final SubmissionTrackingService trackingService;

    @GetMapping("/options")
    public ApiResponse<SubmissionFormOptions> getFormOptions() {
        return ApiResponse.ok("OK", submissionService.getFormOptions());
    }

    /**
     * @RequestPart("data") @Valid: đọc phần "data" (JSON) thành DTO rồi kiểm tra các annotation.
     * required = false cho "files": thiếu tệp thì service báo lỗi tiếng Việt ngay dưới ô tệp,
     * thay vì Spring tự trả lỗi chung chung.
     * 201 CREATED: mã HTTP chuẩn cho "đã tạo mới một bản ghi".
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SubmissionReceipt> create(@AuthenticationPrincipal Jwt jwt,
                                                 @Valid @RequestPart("data") CreateSubmissionRequest request,
                                                 @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok("Gửi phản ánh thành công!", submissionService.create(jwt.getSubject(), request, files));
    }

    /** @RequestParam(defaultValue): không truyền page/size thì lấy trang đầu, 10 dòng. */
    @GetMapping("/mine")
    public ApiResponse<PageResponse<SubmissionSummary>> listMine(@AuthenticationPrincipal Jwt jwt,
                                                                @RequestParam(defaultValue = "0") int page,
                                                                @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", trackingService.listMine(jwt.getSubject(), page, size));
    }

    /** @PathVariable: lấy mã hồ sơ từ đường dẫn, ví dụ /mine/KB-2026-0001 -> "KB-2026-0001". */
    @GetMapping("/mine/{trackingCode}")
    public ApiResponse<SubmissionDetail> getMine(@AuthenticationPrincipal Jwt jwt, @PathVariable String trackingCode) {
        return ApiResponse.ok("OK", trackingService.getMine(jwt.getSubject(), trackingCode));
    }
}
