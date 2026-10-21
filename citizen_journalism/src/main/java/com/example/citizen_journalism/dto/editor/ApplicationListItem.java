package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.ContributorApplication.Status;
import java.time.LocalDateTime;
import java.util.List;

/** Một dòng trong danh sách "Đơn đăng ký CTV" của Biên tập viên (GET /api/editor/applications). */
public record ApplicationListItem(
        Long id,
        String applicantId,
        String applicantName,
        String applicantEmail,
        String avatarUrl,
        Integer reputationScore,
        String province,
        List<String> expertiseFields,
        Status status,
        LocalDateTime createdAt) {
}
