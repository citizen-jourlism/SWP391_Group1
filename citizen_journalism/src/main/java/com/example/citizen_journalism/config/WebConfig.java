package com.example.citizen_journalism.config;

import com.example.citizen_journalism.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cấu hình web: cho phép trình duyệt xem các file đã tải lên.
 *
 * Ví dụ: DB lưu avatarUrl = "/uploads/avatars/CT0001-1a2b3c4d.png"
 *   -> trình duyệt mở http://localhost:8080/uploads/avatars/CT0001-1a2b3c4d.png
 *   -> Spring trả về file D:/.../citizen_journalism/uploads/avatars/CT0001-1a2b3c4d.png
 * Ở frontend, Vite chuyển tiếp /uploads sang backend (xem frontend/vite.config.js).
 * SecurityConfig cho phép truy cập tự do các đường dẫn này (không thuộc /api/**).
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageService fileStorageService;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // toUri() trả về dạng "file:///D:/.../uploads/"; dấu "/" cuối là bắt buộc để Spring hiểu đây là thư mục.
        String location = fileStorageService.getRoot().toUri().toString();
        registry.addResourceHandler(FileStorageService.URL_PREFIX + "**")
                .addResourceLocations(location.endsWith("/") ? location : location + "/");
    }
}
