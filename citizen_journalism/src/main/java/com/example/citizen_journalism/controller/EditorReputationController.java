package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.EditorSubmissionDetail;
import com.example.citizen_journalism.dto.editor.ReputationAccountSummary;
import com.example.citizen_journalism.dto.editor.ReputationResearchItem;
import com.example.citizen_journalism.dto.editor.ReputationReviewResult;
import com.example.citizen_journalism.dto.editor.ReputationSubmissionItem;
import com.example.citizen_journalism.dto.editor.ReputationResearchDetail;
import com.example.citizen_journalism.dto.editor.ReviewSubmissionRequest;
import com.example.citizen_journalism.dto.editor.ResearchReviewDetail;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.service.EditorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/editor")
@RequiredArgsConstructor
public class EditorReputationController {
    private final EditorService editorService;

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

    @GetMapping("/reputation/submissions/{trackingCode}")
    public ApiResponse<EditorSubmissionDetail> getReputationSubmission(@PathVariable String trackingCode) {
        return ApiResponse.ok("OK", editorService.getReputationSubmission(trackingCode));
    }

    @PostMapping("/reputation/submissions/{trackingCode}/review")
    public ApiResponse<ReputationReviewResult<EditorSubmissionDetail>> reviewReputationSubmission(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String trackingCode,
            @Valid @RequestBody ReviewSubmissionRequest request) {
        ReputationReviewResult<EditorSubmissionDetail> result =
                editorService.reviewSubmission(jwt.getSubject(), trackingCode, request);
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

}
