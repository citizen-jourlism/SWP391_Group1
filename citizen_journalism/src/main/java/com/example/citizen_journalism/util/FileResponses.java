package com.example.citizen_journalism.util;

import com.example.citizen_journalism.service.ContributorApplicationService.DocumentFile;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;

/**
 * Tạo phản hồi TRẢ FILE về trình duyệt (dùng chung cho các API xem giấy tờ riêng tư).
 *
 * - Content-Type đúng loại tệp -> trình duyệt tự hiển thị ảnh / PDF.
 * - Content-Disposition "inline" = mở xem ngay (không bắt tải về), kèm tên tệp gốc (có dấu tiếng Việt, mã hoá UTF-8).
 * - Cache-Control "no-store": không lưu bản sao giấy tờ tuỳ thân trong bộ nhớ đệm của trình duyệt.
 */
public final class FileResponses {

    private FileResponses() {
    }

    public static ResponseEntity<Resource> inline(DocumentFile file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(file.resource());
    }
}
