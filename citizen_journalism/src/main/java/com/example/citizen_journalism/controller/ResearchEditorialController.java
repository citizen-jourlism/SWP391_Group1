package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.service.ResearchEditorialService;
import com.example.citizen_journalism.service.ResearchEditorialService.ApproveBody;
import com.example.citizen_journalism.service.ResearchEditorialService.ArticleItem;
import com.example.citizen_journalism.service.ResearchEditorialService.CommentBody;
import com.example.citizen_journalism.service.ResearchEditorialService.Detail;
import com.example.citizen_journalism.service.ResearchEditorialService.EditStatus;
import com.example.citizen_journalism.service.ResearchEditorialService.Fields;
import com.example.citizen_journalism.service.ResearchEditorialService.MyReviewResult;
import com.example.citizen_journalism.service.ResearchEditorialService.QueueItem;
import com.example.citizen_journalism.service.ResearchEditorialService.QueueType;
import com.example.citizen_journalism.service.ResearchEditorialService.RejectBody;
import com.example.citizen_journalism.service.ResearchEditorialService.Review;
import com.example.citizen_journalism.service.ResearchEditorialService.Revision;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API LUỒNG BIÊN TẬP BÀI NGHIÊN CỨU — mọi xử lý nằm ở ResearchEditorialService.
 * Phân quyền dùng luật có sẵn trong SecurityConfig: "/api/editor/**" chỉ EDITOR, "/api/research/**" chỉ EXPERT.
 * jwt.getSubject() = mã người đang đăng nhập (ví dụ ED0001, EX0001).
 *
 * Đường dẫn cố định ("/api/research/revisions", "/api/research/review-results") được Spring ưu tiên hơn
 * "/api/research/{id}" của ResearchController nên không đè nhau.
 */
@RestController
@RequiredArgsConstructor
public class ResearchEditorialController {

    private final ResearchEditorialService service;

    // ============ BIÊN TẬP VIÊN (frontend: services/editorService.js) ============

    /** Hàng đợi gộp hồ sơ phản ánh + bài nghiên cứu. type / status / field không truyền = tất cả. */
    @GetMapping("/api/editor/queue")
    public ApiResponse<PageResponse<QueueItem>> listQueue(
            @RequestParam(required = false) Submission.SubmissionStatus status,
            @RequestParam(required = false) QueueType type,
            @RequestParam(required = false) String field,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", service.listQueue(status, type, field, page, size));
    }

    /** Danh sách lĩnh vực cho ô lọc. */
    @GetMapping("/api/editor/queue/fields")
    public ApiResponse<List<String>> listFields() {
        return ApiResponse.ok("OK", service.listFields());
    }

    /** Màn "Biên tập bài viết". q = tìm trong tiêu đề. */
    @GetMapping("/api/editor/articles")
    public ApiResponse<PageResponse<ArticleItem>> listArticles(
            @RequestParam(required = false) EditStatus editStatus,
            @RequestParam(required = false) String field,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", service.listArticles(editStatus, field, q, page, size));
    }

    @GetMapping("/api/editor/research/{id}")
    public ApiResponse<Detail> getDetail(@PathVariable Long id) {
        return ApiResponse.ok("OK", service.getDetail(id));
    }

    @PostMapping("/api/editor/research/{id}/revision-requests")
    public ApiResponse<Revision> requestRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                 @Valid @RequestBody Fields body) {
        return ApiResponse.ok("Đã gửi yêu cầu chỉnh sửa cho Chuyên gia.", service.requestRevision(jwt.getSubject(), id, body));
    }

    @PostMapping("/api/editor/research/{id}/approve")
    public ApiResponse<Review> approve(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                       @Valid @RequestBody ApproveBody body) {
        return ApiResponse.ok("Đã duyệt bài và chuyển tới Phó Tổng biên tập.", service.approve(jwt.getSubject(), id, body));
    }

    @PostMapping("/api/editor/research/{id}/reject")
    public ApiResponse<Review> reject(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                      @Valid @RequestBody RejectBody body) {
        return ApiResponse.ok("Đã từ chối bài nghiên cứu.", service.reject(jwt.getSubject(), id, body.reason()));
    }

    /** revisionId = id yêu cầu chỉnh sửa (không phải id bài). */
    @PostMapping("/api/editor/research/revisions/{revisionId}/comments")
    public ApiResponse<Revision> editorComment(@AuthenticationPrincipal Jwt jwt, @PathVariable Long revisionId,
                                               @Valid @RequestBody CommentBody body) {
        return ApiResponse.ok("Đã gửi bình luận.", service.comment(jwt.getSubject(), revisionId, body.content()));
    }

    // ============ CHUYÊN GIA (frontend: services/researchService.js) ============

    @GetMapping("/api/research/revisions")
    public ApiResponse<List<Revision>> listMyRevisions(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("OK", service.listMyRevisions(jwt.getSubject()));
    }

    @GetMapping("/api/research/revisions/{id}")
    public ApiResponse<Revision> getMyRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("OK", service.getMyRevision(jwt.getSubject(), id));
    }

    @PostMapping("/api/research/revisions/{id}/comments")
    public ApiResponse<Revision> expertComment(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                               @Valid @RequestBody CommentBody body) {
        return ApiResponse.ok("Đã gửi bình luận.", service.comment(jwt.getSubject(), id, body.content()));
    }

    /** body = bản cuối (đúng bản đề xuất hoặc bản Chuyên gia đã điều chỉnh). */
    @PostMapping("/api/research/revisions/{id}/accept")
    public ApiResponse<Revision> acceptRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                @Valid @RequestBody Fields body) {
        return ApiResponse.ok("Đã đồng ý chỉnh sửa. Nội dung bài đã được cập nhật.",
                service.acceptRevision(jwt.getSubject(), id, body));
    }

    @PostMapping("/api/research/revisions/{id}/reject")
    public ApiResponse<Revision> rejectRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                @Valid @RequestBody RejectBody body) {
        return ApiResponse.ok("Đã từ chối yêu cầu chỉnh sửa.", service.rejectRevision(jwt.getSubject(), id, body.reason()));
    }

    /** Kết quả duyệt các bài của tôi (bị từ chối kèm lý do / đã duyệt). */
    @GetMapping("/api/research/review-results")
    public ApiResponse<List<MyReviewResult>> listMyReviewResults(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("OK", service.listMyReviewResults(jwt.getSubject()));
    }
}
