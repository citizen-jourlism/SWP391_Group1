package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Evidence.FileType;

/**
 * Thông tin MỘT tệp tư liệu trả về cho frontend (hiện ở màn hình "Gửi thành công").
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
}
