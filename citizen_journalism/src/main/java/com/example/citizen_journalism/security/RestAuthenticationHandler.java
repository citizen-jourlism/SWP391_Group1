package com.example.citizen_journalism.security;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Trả lỗi 401 / 403 dạng JSON ApiResponse (tiếng Việt) khi Spring Security chặn request.
 *
 * TẠI SAO cần lớp này? Lỗi phân quyền xảy ra trong BỘ LỌC của Spring Security, TRƯỚC khi tới controller,
 * nên GlobalExceptionHandler không bắt được. Nếu không có lớp này, Spring trả về phản hồi rỗng
 * và frontend không có thông báo nào để hiện.
 *
 *   - 401 (commence): chưa đăng nhập, token sai, hoặc token hết hạn -> frontend tự đăng xuất (xem lib/api.js).
 *   - 403 (handle)  : đã đăng nhập nhưng vai trò không đủ quyền (ví dụ Người dân vào trang admin).
 *
 * Được gắn vào SecurityConfig ở 2 chỗ: oauth2ResourceServer (token lỗi) và exceptionHandling (chưa có token / sai quyền).
 */
@Component
@RequiredArgsConstructor
public class RestAuthenticationHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    // ObjectMapper của Jackson 3 (Spring Boot 4) – dùng để chuyển ApiResponse thành chuỗi JSON.
    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {
        write(response, HttpStatus.UNAUTHORIZED, "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.",
                ErrorCode.UNAUTHORIZED);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
            throws IOException {
        write(response, HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện chức năng này.", ErrorCode.FORBIDDEN);
    }

    private void write(HttpServletResponse response, HttpStatus status, String message, String code) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name()); // để tiếng Việt không bị lỗi font
        response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error(message, code, null)));
    }
}
