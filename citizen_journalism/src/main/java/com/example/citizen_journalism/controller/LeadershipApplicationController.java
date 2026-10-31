package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.*;
import com.example.citizen_journalism.dto.editor.*;
import com.example.citizen_journalism.service.ContributorApplicationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.core.io.Resource;

@RestController @RequiredArgsConstructor @RequestMapping("/api/leadership/applications")
public class LeadershipApplicationController {
    private final ContributorApplicationService service;
    public record Decision(@NotNull Boolean approve, @Size(max=1000) String note) {}
    @GetMapping
    public ApiResponse<PageResponse<ApplicationListItem>> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size) {
        return ApiResponse.ok("OK",service.listForLeadership(page,size));
    }
    @GetMapping("/{id}")
    public ApiResponse<EditorApplicationDetail> get(@PathVariable Long id) { return ApiResponse.ok("OK",service.getForEditor(id)); }
    @PostMapping("/{id}/decision")
    public ApiResponse<EditorApplicationDetail> decide(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody Decision body) {
        return ApiResponse.ok("Đã duyệt đơn.",service.finalReview(jwt.getSubject(),id,body.approve(),body.note()));
    }
    @GetMapping("/{id}/documents/{index}")
    public ResponseEntity<Resource> document(@PathVariable Long id,@PathVariable int index) {
        var file=service.openDocumentForStaff(id,index);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName(),java.nio.charset.StandardCharsets.UTF_8).build().toString()).body(file.resource());
    }
}
