package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.service.DeputyFieldService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Danh sách LĨNH VỰC (chuyên mục đang bật) để admin chọn khi tạo tài khoản Phó Tổng biên tập.
 * Luồng: CreateUserDialog.jsx -> adminService.getDeputyFields -> GET /api/admin/deputy-fields -> DeputyFieldService.
 * Nằm dưới /api/admin/** nên SecurityConfig đã giới hạn chỉ SYSTEM_ADMIN gọi được.
 */
@RestController
@RequestMapping("/api/admin/deputy-fields")
@RequiredArgsConstructor
public class DeputyFieldController {

    private final DeputyFieldService deputyFieldService;

    @GetMapping
    public ApiResponse<List<DeputyFieldService.FieldOption>> list() {
        return ApiResponse.ok("Danh sách lĩnh vực.", deputyFieldService.listActive());
    }
}
