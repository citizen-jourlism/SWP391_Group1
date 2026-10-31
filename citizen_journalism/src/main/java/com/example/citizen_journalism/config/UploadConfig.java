package com.example.citizen_journalism.config;

import com.example.citizen_journalism.service.SubmissionService;
import jakarta.servlet.MultipartConfigElement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * GIỚI HẠN DUNG LƯỢNG tải tệp của server, phải lớn hơn giới hạn nghiệp vụ trong SubmissionService.
 *
 * TẠI SAO không để trong application.properties? File đó không đưa lên git nên máy mỗi người một giá trị:
 * giao diện báo được tải 300MB nhưng server chặn ở 50MB với lỗi chung chung. Khai báo ở đây thì mọi máy giống nhau
 * và lỗi vượt giới hạn do SubmissionService báo bằng tiếng Việt, đúng từng loại tệp.
 */
@Configuration
public class UploadConfig {

    /** Chừa thêm chỗ cho phần "data" (JSON) đi kèm tệp trong cùng 1 request. */
    private static final long EXTRA_REQUEST_BYTES = 10L * 1024 * 1024;

    @Bean
    public MultipartConfigElement multipartConfigElement() {
        long maxBytes = SubmissionService.MAX_TOTAL_BYTES;
        return new MultipartConfigElement("", maxBytes, maxBytes + EXTRA_REQUEST_BYTES, 0);
    }
}
