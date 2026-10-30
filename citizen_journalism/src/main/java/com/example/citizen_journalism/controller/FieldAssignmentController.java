package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.assignment.AssignContributorRequest;
import com.example.citizen_journalism.dto.assignment.AssignmentReasonRequest;
import com.example.citizen_journalism.dto.assignment.AssignmentView;
import com.example.citizen_journalism.dto.assignment.ContributorCandidate;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.service.FieldAssignmentService;
import com.example.citizen_journalism.service.FieldAssignmentService.CandidateSort;
import com.example.citizen_journalism.util.VietnamProvinces;
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
 *   GET  /api/editor/assignments/provinces            -> danh sách tỉnh/thành cho bộ lọc khu vực
 *   GET  /api/editor/assignments/candidates?code=...  -> danh sách CTV để chọn (lọc khu vực, tìm kiếm, điểm, sắp xếp)
 *   GET  /api/editor/assignments/latest?code=...      -> nhiệm vụ mới nhất của 1 hồ sơ (data = null nếu chưa giao)
 *   GET  /api/editor/assignments                      -> danh sách nhiệm vụ đã giao
 *   POST /api/editor/assignments                      -> giao nhiệm vụ
 *   POST /api/editor/assignments/{id}/cancel          -> thu hồi nhiệm vụ (bắt buộc lý do)
 */
@RestController
@RequestMapping("/api/editor/assignments")
@RequiredArgsConstructor
public class FieldAssignmentController {

    private final FieldAssignmentService assignmentService;

    @GetMapping("/provinces")
    public ApiResponse<List<String>> provinces() {
        return ApiResponse.ok("OK", VietnamProvinces.ALL);
    }

    @GetMapping("/candidates")
    public ApiResponse<List<ContributorCandidate>> candidates(
            @RequestParam String code,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int minScore,
            @RequestParam(defaultValue = "RECOMMENDED") CandidateSort sort) {
        return ApiResponse.ok("OK", assignmentService.getCandidates(code, province, q, minScore, sort));
    }

    @GetMapping("/latest")
    public ApiResponse<AssignmentView> latest(@RequestParam String code) {
        return ApiResponse.ok("OK", assignmentService.getLatest(code));
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
    public ApiResponse<AssignmentView> cancel(@PathVariable Long id, @Valid @RequestBody AssignmentReasonRequest request) {
        return ApiResponse.ok("Đã thu hồi nhiệm vụ.", assignmentService.cancel(id, request.reason()));
    }
}
