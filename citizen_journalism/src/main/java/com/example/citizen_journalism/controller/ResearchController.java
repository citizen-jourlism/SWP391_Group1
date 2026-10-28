package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.research.ResearchArticleSummary;
import com.example.citizen_journalism.dto.research.ResearchArticleView;
import com.example.citizen_journalism.dto.research.ResearchOptions;
import com.example.citizen_journalism.dto.research.SaveResearchRequest;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.service.ResearchArticleService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API BÀI NGHIÊN CỨU + BẢN NHÁP — chỉ vai trò EXPERT (luật "/api/research/**" trong SecurityConfig).
 * Mọi thao tác chỉ trên bài CỦA CHÍNH MÌNH (mã người dùng lấy từ token).
 *
 *   GET    /api/research/options              -> lĩnh vực, điều kiện nộp bài, giới hạn ảnh, số bản nháp / bài đã nộp
 *   GET    /api/research?status=DRAFT&page=   -> danh sách bản nháp, bài chờ duyệt hoặc bài đã duyệt
 *   GET    /api/research/{id}                 -> mở 1 bài
 *   POST   /api/research                      -> bài mới (multipart: "data" JSON + "files" ảnh mới); action DRAFT / SUBMIT
 *   PUT    /api/research/{id}                 -> lưu tiếp bản nháp hoặc nộp bài (multipart như trên)
 *   DELETE /api/research/{id}                 -> xoá bản nháp
 */
@RestController
@RequestMapping("/api/research")
@RequiredArgsConstructor
public class ResearchController {

    private final ResearchArticleService researchService;

    @GetMapping("/options")
    public ApiResponse<ResearchOptions> options(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok("OK", researchService.getOptions(jwt.getSubject()));
    }

    @GetMapping
    public ApiResponse<PageResponse<ResearchArticleSummary>> list(@AuthenticationPrincipal Jwt jwt,
                                                                  @RequestParam(defaultValue = "DRAFT") ResearchArticle.Status status,
                                                                  @RequestParam(defaultValue = "0") int page,
                                                                  @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.ok("OK", researchService.list(jwt.getSubject(), status, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<ResearchArticleView> get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return ApiResponse.ok("OK", researchService.get(jwt.getSubject(), id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ResearchArticleView> create(@AuthenticationPrincipal Jwt jwt,
                                                   @Valid @RequestPart("data") SaveResearchRequest request,
                                                   @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok(messageOf(request), researchService.create(jwt.getSubject(), request, files));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ResearchArticleView> update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                                   @Valid @RequestPart("data") SaveResearchRequest request,
                                                   @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok(messageOf(request), researchService.update(jwt.getSubject(), id, request, files));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        researchService.delete(jwt.getSubject(), id);
        return ApiResponse.ok("Đã xoá bản nháp.");
    }

    private static String messageOf(SaveResearchRequest request) {
        return request.action() == SaveResearchRequest.Action.SUBMIT
                ? "Đã nộp bài nghiên cứu cho toà soạn!"
                : "Đã lưu bản nháp.";
    }
}
