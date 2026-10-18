package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Evidence;
import com.example.citizen_journalism.entity.Evidence.FileType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Thông tin MỘT tệp tư liệu trả về cho frontend (màn hình biên nhận, chi tiết hồ sơ).
 *
 * @param fileName tên gốc của tệp (chỉ để hiển thị)
 * @param fileType loại tệp: ảnh, video, ghi âm, tài liệu
 * @param size     dung lượng (byte)
 * @param url      đường dẫn xem tệp, ví dụ "/uploads/evidences/KB-2026-0001-1a2b3c4d.jpg"
 */
public record EvidenceInfo(
        String fileName,
        FileType fileType,
        long size,
        String url) {

    /**
     * Tạo từ 1 dòng bảng evidences. Tên gốc và dung lượng nằm trong cột metadata (JSON) nên cần
     * ObjectMapper để đọc. readTree đọc JSON thành cây; path("x") không có thì trả về nút rỗng (không lỗi).
     */
    public static EvidenceInfo from(Evidence evidence, ObjectMapper objectMapper) {
        JsonNode metadata = objectMapper.readTree(evidence.getMetadata() == null ? "{}" : evidence.getMetadata());
        return new EvidenceInfo(
                metadata.path("originalName").asString("tep-dinh-kem"),
                evidence.getFileType(),
                metadata.path("size").asLong(0),
                evidence.getFileUrl());
    }
}
