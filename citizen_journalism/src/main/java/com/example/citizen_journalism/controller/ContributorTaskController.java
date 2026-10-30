package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.assignment.AssignmentReasonRequest;
import com.example.citizen_journalism.dto.assignment.ContributorTaskDetail;
import com.example.citizen_journalism.dto.assignment.ContributorTaskItem;
import com.example.citizen_journalism.dto.assignment.SubmitFieldReportRequest;
import com.example.citizen_journalism.entity.FieldAssignment.AssignmentStatus;
import com.example.citizen_journalism.service.ContributorTaskService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API NHIỆM VỤ CỦA CỘNG TÁC VIÊN (SecurityConfig: /api/contributor/** chỉ vai trò CONTRIBUTOR).
 * Mã CTV luôn lấy từ token, nên mỗi người chỉ thao tác được trên nhiệm vụ của mình.
 *
 *   GET  /api/contributor/tasks              -> danh sách nhiệm vụ (lọc status, phân trang)
 *   GET  /api/contributor/tasks/counts       -> số nhiệm vụ theo từng trạng thái
 *   GET  /api/contributor/tasks/{id}         -> chi tiết 1 nhiệm vụ
 *   POST /api/contributor/tasks/{id}/accept  -> nhận nhiệm vụ
 *   POST /api/contributor/tasks/{id}/decline -> từ chối nhiệm vụ đang chờ phản hồi (bắt buộc lý do)
 *   POST /api/contributor/tasks/{id}/cancel  -> huỷ nhiệm vụ đã nhận (bắt buộc lý do)
 *   POST /api/contributor/tasks/{id}/report  -> nộp báo cáo hiện trường (multipart: "data" + "files")
 */
@RestController
@RequestMapping("/api/contributor/tasks")
@RequiredArgsConstructor
public class ContributorTaskController {

    private final ContributorTaskService taskService;

    @GetMapping
    public ApiResponse<PageResponse<ContributorTaskItem>> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) AssignmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", taskService.list(jwt.getSubject(), status, page, size));
    }

    @GetMapping("/counts")
    public ApiResponse<Map<AssignmentStatus, Long>> counts(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("OK", taskService.countByStatus(jwt.getSubject()));
    }

    @GetMapping("/{id}")
    public ApiResponse<ContributorTaskDetail> get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("OK", taskService.get(jwt.getSubject(), id));
    }

    @PostMapping("/{id}/accept")
    public ApiResponse<ContributorTaskDetail> accept(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("Bạn đã nhận nhiệm vụ.", taskService.accept(jwt.getSubject(), id));
    }

    @PostMapping("/{id}/decline")
    public ApiResponse<ContributorTaskDetail> decline(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                      @Valid @RequestBody AssignmentReasonRequest request) {
        return ApiResponse.ok("Bạn đã từ chối nhiệm vụ.", taskService.decline(jwt.getSubject(), id, request.reason()));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<ContributorTaskDetail> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                     @Valid @RequestBody AssignmentReasonRequest request) {
        return ApiResponse.ok("Bạn đã huỷ nhiệm vụ.", taskService.cancel(jwt.getSubject(), id, request.reason()));
    }

    /** required = false cho "files": thiếu tệp thì service báo lỗi tiếng Việt ngay dưới ô tệp. */
    @PostMapping("/{id}/report")
    public ApiResponse<ContributorTaskDetail> submitReport(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                           @Valid @RequestPart("data") SubmitFieldReportRequest request,
                                                           @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok("Đã nộp báo cáo hiện trường.", taskService.submitReport(jwt.getSubject(), id, request, files));
    }
}
