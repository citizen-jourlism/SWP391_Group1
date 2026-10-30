package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.assignment.AssignContributorRequest;
import com.example.citizen_journalism.dto.assignment.AssignmentHistoryEntry;
import com.example.citizen_journalism.dto.assignment.AssignmentReasonRequest;
import com.example.citizen_journalism.dto.assignment.AssignmentView;
import com.example.citizen_journalism.dto.assignment.ContributorCandidate;
import com.example.citizen_journalism.dto.assignment.FieldReportView;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReportFeedback;
import com.example.citizen_journalism.service.FieldAssignmentService;
import com.example.citizen_journalism.service.FieldAssignmentService.CandidateSort;
import com.example.citizen_journalism.service.FieldReportService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * API GIAO NHIỆM VỤ XÁC MINH HIỆN TRƯỜNG của Biên tập viên (SecurityConfig: /api/editor/** chỉ vai trò EDITOR).
 *
 *   GET  /api/editor/assignments/candidates?code=...  -> danh sách CTV để chọn (lọc tỉnh, phường/xã, tìm kiếm, điểm, sắp xếp)
 *   GET  /api/editor/assignments/latest?code=...      -> nhiệm vụ mới nhất của 1 hồ sơ (data = null nếu chưa giao)
 *   GET  /api/editor/assignments/history?code=...     -> lịch sử nhiệm vụ của 1 hồ sơ
 *   GET  /api/editor/assignments/{id}/report          -> báo cáo hiện trường của 1 nhiệm vụ
 *   POST /api/editor/assignments/{id}/report/revision -> yêu cầu CTV sửa bài viết (bắt buộc nội dung)
 *   POST /api/editor/assignments/{id}/report/evidence -> yêu cầu CTV bổ sung tư liệu (bắt buộc nội dung)
 *   POST /api/editor/assignments/{id}/report/approve  -> duyệt báo cáo
 *   GET  /api/editor/assignments                      -> danh sách nhiệm vụ, mỗi hồ sơ 1 dòng
 *   POST /api/editor/assignments                      -> giao nhiệm vụ
 *   POST /api/editor/assignments/{id}/cancel          -> thu hồi nhiệm vụ (bắt buộc lý do)
 */
@RestController
@RequestMapping("/api/editor/assignments")
@RequiredArgsConstructor
public class FieldAssignmentController {

    private final FieldAssignmentService assignmentService;
    private final FieldReportService fieldReportService;

    @GetMapping("/candidates")
    public ApiResponse<List<ContributorCandidate>> candidates(
            @RequestParam String code,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String ward,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int minScore,
            @RequestParam(defaultValue = "RECOMMENDED") CandidateSort sort) {
        return ApiResponse.ok("OK", assignmentService.getCandidates(code, province, ward, q, minScore, sort));
    }

    @GetMapping("/latest")
    public ApiResponse<AssignmentView> latest(@RequestParam String code) {
        return ApiResponse.ok("OK", assignmentService.getLatest(code));
    }

    @GetMapping("/history")
    public ApiResponse<List<AssignmentHistoryEntry>> history(@RequestParam String code) {
        return ApiResponse.ok("OK", assignmentService.getHistory(code));
    }

    @GetMapping("/{id}/report")
    public ApiResponse<FieldReportView> report(@PathVariable Long id) {
        return ApiResponse.ok("OK", assignmentService.getReport(id));
    }

    @PostMapping("/{id}/report/revision")
    public ApiResponse<FieldReportView> requestRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                        @Valid @RequestBody AssignmentReasonRequest request) {
        return ApiResponse.ok("Đã gửi yêu cầu sửa bài cho Cộng tác viên.",
                fieldReportService.request(jwt.getSubject(), id, FieldReportFeedback.Type.REQUEST_REVISION, request.reason()));
    }

    @PostMapping("/{id}/report/evidence")
    public ApiResponse<FieldReportView> requestEvidence(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                        @Valid @RequestBody AssignmentReasonRequest request) {
        return ApiResponse.ok("Đã gửi yêu cầu bổ sung tư liệu cho Cộng tác viên.",
                fieldReportService.request(jwt.getSubject(), id, FieldReportFeedback.Type.REQUEST_EVIDENCE, request.reason()));
    }

    @PostMapping("/{id}/report/approve")
    public ApiResponse<FieldReportView> approveReport(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("Đã duyệt báo cáo.", fieldReportService.approve(jwt.getSubject(), id));
    }

    @GetMapping
    public ApiResponse<PageResponse<AssignmentView>> list(
            @RequestParam(required = false) FieldAssignment.AssignmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", assignmentService.list(status, page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AssignmentView> assign(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody AssignContributorRequest request) {
        return ApiResponse.ok("Đã giao nhiệm vụ cho Cộng tác viên.", assignmentService.assign(jwt.getSubject(), request));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<AssignmentView> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                              @Valid @RequestBody AssignmentReasonRequest request) {
        return ApiResponse.ok("Đã thu hồi nhiệm vụ.", assignmentService.cancel(jwt.getSubject(), id, request.reason()));
    }
}
