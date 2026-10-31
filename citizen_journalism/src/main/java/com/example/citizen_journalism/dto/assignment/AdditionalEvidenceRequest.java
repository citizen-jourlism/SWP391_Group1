package com.example.citizen_journalism.dto.assignment;

import jakarta.validation.constraints.Size;

/**
 * Cộng tác viên BỔ SUNG TƯ LIỆU theo yêu cầu của Biên tập viên: POST /api/contributor/tasks/{id}/report/evidence
 * (phần "data" của multipart; tệp nằm ở phần "files").
 *
 * @param note lời nhắn gửi Biên tập viên (không bắt buộc)
 */
public record AdditionalEvidenceRequest(
        @Size(max = 1000, message = "Lời nhắn tối đa 1000 ký tự.")
        String note
) {
}
