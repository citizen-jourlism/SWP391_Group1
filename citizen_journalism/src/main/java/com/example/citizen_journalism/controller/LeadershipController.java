package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.service.LeadershipService;
import com.example.citizen_journalism.service.LeadershipService.Decision;
import com.example.citizen_journalism.service.LeadershipService.DecisionBody;
import com.example.citizen_journalism.service.LeadershipService.Kind;
import com.example.citizen_journalism.service.LeadershipService.Note;
import com.example.citizen_journalism.service.LeadershipService.QueueItem;
import com.example.citizen_journalism.service.LeadershipService.ResearchReview;
import com.example.citizen_journalism.service.LeadershipService.SubmissionReview;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * API BÀN DUYỆT của Ban biên tập. Nghiệp vụ nằm trong LeadershipService.
 * SecurityConfig: /api/leadership/notes/** cho EDITOR, DEPUTY_EIC, EIC (BTV đọc ý kiến của Ban biên tập);
 *                 phần còn lại của /api/leadership/** chỉ DEPUTY_EIC và EIC.
 *
 *   GET  /api/leadership/queue?kind=SUBMISSION|RESEARCH&type=&q=&page=&size=  -> danh sách chờ mình duyệt
 *   GET  /api/leadership/submissions/{mã}             -> chi tiết hồ sơ
 *   POST /api/leadership/submissions/{mã}/decision    -> { decision, note, breakingSigns }
 *   GET  /api/leadership/research/{id}                -> chi tiết bài nghiên cứu
 *   POST /api/leadership/research/{id}/decision
 *   GET  /api/leadership/notes/submissions/{mã}       -> ý kiến của Ban biên tập (cho BTV)
 *   GET  /api/leadership/notes/research/{id}
 */
@RestController
@RequestMapping("/api/leadership")
@RequiredArgsConstructor
public class LeadershipController {

    /** Thông báo sau từng quyết định. */
    private static final Map<Decision, String> MESSAGES = Map.of(
            Decision.APPROVE, "Đã duyệt, bài được phép xuất bản.",
            Decision.ESCALATE, "Đã chuyển Tổng biên tập phê duyệt.",
            Decision.REQUEST_EDIT, "Đã gửi yêu cầu chỉnh sửa cho Biên tập viên.",
            Decision.REJECT, "Đã từ chối, bài dừng xử lý.");

    private final LeadershipService service;

    @GetMapping("/queue")
    public ApiResponse<PageResponse<QueueItem>> queue(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "SUBMISSION") Kind kind,
            @RequestParam(required = false) Submission.ReportCategory type,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", service.listQueue(jwt.getSubject(), kind, type, q, page, size));
    }

    @GetMapping("/submissions/{code}")
    public ApiResponse<SubmissionReview> submission(@AuthenticationPrincipal Jwt jwt, @PathVariable String code) {
        return ApiResponse.ok("OK", service.getSubmission(jwt.getSubject(), code));
    }

    @PostMapping("/submissions/{code}/decision")
    public ApiResponse<SubmissionReview> decideSubmission(@AuthenticationPrincipal Jwt jwt, @PathVariable String code,
                                                          @Valid @RequestBody DecisionBody body) {
        return ApiResponse.ok(MESSAGES.get(body.decision()), service.decideSubmission(jwt.getSubject(), code, body));
    }

    @GetMapping("/research/{id}")
    public ApiResponse<ResearchReview> research(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("OK", service.getResearch(jwt.getSubject(), id));
    }

    @PostMapping("/research/{id}/decision")
    public ApiResponse<ResearchReview> decideResearch(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                      @Valid @RequestBody DecisionBody body) {
        return ApiResponse.ok(MESSAGES.get(body.decision()), service.decideResearch(jwt.getSubject(), id, body));
    }

    @GetMapping("/notes/submissions/{code}")
    public ApiResponse<List<Note>> submissionNotes(@PathVariable String code) {
        return ApiResponse.ok("OK", service.submissionNotes(code));
    }

    @GetMapping("/notes/research/{id}")
    public ApiResponse<List<Note>> researchNotes(@PathVariable Long id) {
        return ApiResponse.ok("OK", service.researchNotes(id));
    }
}
