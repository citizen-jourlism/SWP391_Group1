package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.ApplicationListItem;
import com.example.citizen_journalism.dto.editor.EditorApplicationDetail;
import com.example.citizen_journalism.dto.editor.EditorOverview;
import com.example.citizen_journalism.dto.editor.ReviewApplicationRequest;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.SubmissionSummary;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.service.ContributorApplicationService;
import com.example.citizen_journalism.service.EditorService;
import com.example.citizen_journalism.util.FileResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API BÀN LÀM VIỆC BIÊN TẬP VIÊN — chỉ vai trò EDITOR (luật "/api/editor/**" trong SecurityConfig).
 *
 *   GET  /api/editor/overview                               -> số liệu trang Tổng quan
 *   GET  /api/editor/submissions?status=&category=&page=    -> hàng đợi tin bài (chỉ xem)
 *   GET  /api/editor/submissions/{mã hồ sơ}                 -> chi tiết 1 hồ sơ
 *   GET  /api/editor/applications?status=&page=             -> đơn đăng ký Cộng tác viên
 *   GET  /api/editor/applications/{id}                      -> chi tiết đơn + hồ sơ người nộp
 *   POST /api/editor/applications/{id}/review               -> xét duyệt: chuyển Phó TBT / từ chối
 *   GET  /api/editor/applications/{id}/documents/{index}    -> xem giấy tờ người nộp
 *
 * @RequestParam(required = false): không truyền thì null = không lọc. Spring tự đổi chuỗi "PENDING" thành enum.
 */
@RestController
@RequestMapping("/api/editor")
@RequiredArgsConstructor
public class EditorController {

    private final EditorService editorService;
    private final ContributorApplicationService applicationService;

    @GetMapping("/overview")
    public ApiResponse<EditorOverview> overview() {
        return ApiResponse.ok("OK", editorService.getOverview());
    }

    // ----------------------------- Hàng đợi tin bài -----------------------------

    @GetMapping("/submissions")
    public ApiResponse<PageResponse<SubmissionSummary>> listSubmissions(
            @RequestParam(required = false) Submission.SubmissionStatus status,
            @RequestParam(required = false) Submission.ReportCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", editorService.listSubmissions(status, category, page, size));
    }

    @GetMapping("/submissions/{trackingCode}")
    public ApiResponse<SubmissionDetail> getSubmission(@PathVariable String trackingCode) {
        return ApiResponse.ok("OK", editorService.getSubmission(trackingCode));
    }

    // ----------------------------- Đơn đăng ký CTV -----------------------------

    @GetMapping("/applications")
    public ApiResponse<PageResponse<ApplicationListItem>> listApplications(
            @RequestParam(required = false) ContributorApplication.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", applicationService.listForEditor(status, page, size));
    }

    @GetMapping("/applications/{id}")
    public ApiResponse<EditorApplicationDetail> getApplication(@PathVariable Long id) {
        return ApiResponse.ok("OK", applicationService.getForEditor(id));
    }

    @PostMapping("/applications/{id}/review")
    public ApiResponse<EditorApplicationDetail> reviewApplication(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                                  @Valid @RequestBody ReviewApplicationRequest request) {
        String message = request.decision() == ReviewApplicationRequest.Decision.REJECT
                ? "Đã từ chối đơn đăng ký."
                : "Đã chuyển đơn lên Phó Tổng biên tập phê duyệt.";
        return ApiResponse.ok(message, applicationService.review(jwt.getSubject(), id, request));
    }

    @GetMapping("/applications/{id}/documents/{index}")
    public ResponseEntity<Resource> openApplicationDocument(@PathVariable Long id, @PathVariable int index) {
        return FileResponses.inline(applicationService.openDocumentForStaff(id, index));
    }
}
