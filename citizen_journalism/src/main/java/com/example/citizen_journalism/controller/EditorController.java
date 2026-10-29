package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.ApplicationListItem;
import com.example.citizen_journalism.dto.editor.EditorSubmissionDetail;
import com.example.citizen_journalism.dto.editor.EditorApplicationDetail;
import com.example.citizen_journalism.dto.editor.EditorOverview;
import com.example.citizen_journalism.dto.editor.EditorSubmissionSummary;
import com.example.citizen_journalism.dto.editor.ReputationAccountSummary;
import com.example.citizen_journalism.dto.editor.ReputationResearchItem;
import com.example.citizen_journalism.dto.editor.ReputationReviewResult;
import com.example.citizen_journalism.dto.editor.ReputationSubmissionItem;
import com.example.citizen_journalism.dto.editor.ReputationResearchDetail;
import com.example.citizen_journalism.dto.editor.ReviewSubmissionRequest;
import com.example.citizen_journalism.dto.editor.ReviewApplicationRequest;
import com.example.citizen_journalism.dto.editor.ResearchReviewDetail;
import com.example.citizen_journalism.dto.violation.ReviewAppealRequest;
import com.example.citizen_journalism.dto.violation.ViolationAppealView;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.ViolationAppeal;
import com.example.citizen_journalism.service.ContributorApplicationService;
import com.example.citizen_journalism.service.EditorService;
import com.example.citizen_journalism.service.ViolationAppealService;
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
 *   GET  /api/editor/submissions?status=&category=&page=    -> hàng đợi tin bài
 *   GET  /api/editor/submissions/{mã hồ sơ}                 -> chi tiết 1 hồ sơ
 *   GET  /api/editor/reputation/accounts                    -> danh sách Citizen / Expert
 *   GET  /api/editor/reputation/accounts/{id}/submissions   -> bài gửi của tài khoản
 *   GET  /api/editor/reputation/accounts/{id}/research      -> bài nghiên cứu của Expert
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
    private final ViolationAppealService appealService;

    @GetMapping("/overview")
    public ApiResponse<EditorOverview> overview() {
        return ApiResponse.ok("OK", editorService.getOverview());
    }

    // ----------------------------- Hàng đợi tin bài -----------------------------

    @GetMapping("/submissions")
    public ApiResponse<PageResponse<EditorSubmissionSummary>> listSubmissions(
            @RequestParam(required = false) Submission.SubmissionStatus status,
            @RequestParam(required = false) Submission.ReportCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", editorService.listSubmissions(status, category, page, size));
    }

    @GetMapping("/submissions/{trackingCode}")
    public ApiResponse<EditorSubmissionDetail> getSubmission(@PathVariable String trackingCode) {
        return ApiResponse.ok("OK", editorService.getSubmission(trackingCode));
    }

    @GetMapping("/reputation/accounts")
    public ApiResponse<PageResponse<ReputationAccountSummary>> listReputationAccounts(
            @RequestParam User.Role role,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", editorService.listReputationAccounts(role, keyword, page, size));
    }

    @GetMapping("/reputation/accounts/{accountId}")
    public ApiResponse<ReputationAccountSummary> getReputationAccount(@PathVariable String accountId) {
        return ApiResponse.ok("OK", editorService.getReputationAccount(accountId));
    }

    @GetMapping("/reputation/accounts/{accountId}/submissions")
    public ApiResponse<PageResponse<ReputationSubmissionItem>> listReputationSubmissions(
            @PathVariable String accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", editorService.listReputationSubmissions(accountId, page, size));
    }

    @GetMapping("/reputation/accounts/{accountId}/research")
    public ApiResponse<PageResponse<ReputationResearchItem>> listReputationResearch(
            @PathVariable String accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", editorService.listReputationResearch(accountId, page, size));
    }

    @GetMapping("/reputation/research/{id}")
    public ApiResponse<ReputationResearchDetail> getReputationResearch(@PathVariable Long id) {
        return ApiResponse.ok("OK", editorService.getReputationResearch(id));
    }

    @PostMapping("/reputation/submissions/{trackingCode}/review")
    public ApiResponse<ReputationReviewResult<EditorSubmissionDetail>> reviewReputationSubmission(
            @PathVariable String trackingCode, @Valid @RequestBody ReviewSubmissionRequest request) {
        ReputationReviewResult<EditorSubmissionDetail> result =
                editorService.reviewSubmission(trackingCode, request);
        return reputationReviewResponse(result);
    }

    @PostMapping("/reputation/research/{id}/review")
    public ApiResponse<ReputationReviewResult<com.example.citizen_journalism.dto.editor.ResearchReviewDetail>>
    reviewReputationResearch(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                             @Valid @RequestBody ReviewSubmissionRequest request) {
        return reputationReviewResponse(editorService.reviewResearch(jwt.getSubject(), id, request));
    }

    private static <T> ApiResponse<ReputationReviewResult<T>> reputationReviewResponse(
            ReputationReviewResult<T> result) {
        String message;
        if (result.pointsChange() < 0) {
            message = "Đã ghi nhận tin sai, trừ 10 điểm uy tín và gỡ bài."
                    + (result.accountStatus() == User.Status.LOCKED
                            ? " Tài khoản đã bị khóa vì điểm uy tín dưới 80." : "");
        } else if (result.pointsChange() > 0) {
            message = "Đã ghi nhận bài viết hợp lệ và cộng " + result.pointsChange() + " điểm uy tín.";
        } else {
            message = "Đã xử lý bài viết. Tài khoản đã đạt mức điểm uy tín tối đa 100, không được cộng thêm.";
        }
        return ApiResponse.ok(message, result);
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

    @GetMapping("/appeals")
    public ApiResponse<PageResponse<ViolationAppealView>> listAppeals(
            @RequestParam(required = false) ViolationAppeal.Status status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", appealService.list(status, keyword, page, size));
    }

    @GetMapping("/appeals/{id}")
    public ApiResponse<ViolationAppealView> getAppeal(@PathVariable Long id) {
        return ApiResponse.ok("OK", appealService.get(id));
    }

    @PostMapping("/appeals/{id}/review")
    public ApiResponse<ViolationAppealView> reviewAppeal(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                          @Valid @RequestBody ReviewAppealRequest request) {
        ViolationAppealView appeal = appealService.review(jwt.getSubject(), id, request);
        String message = request.decision() == ReviewAppealRequest.Decision.FORWARD
                ? "Đã chuyển khiếu nại đến bước phê duyệt cuối."
                : "Đã từ chối khiếu nại.";
        return ApiResponse.ok(message, appeal);
    }
}
