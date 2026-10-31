package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.service.LocationService;
import com.example.citizen_journalism.util.VietnamProvinces;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API DANH MỤC ĐỊA CHỈ dùng chung, chỉ cần đăng nhập (SecurityConfig: /api/** còn lại).
 *
 *   GET /api/locations/provinces              -> 34 tỉnh, thành phố
 *   GET /api/locations/wards?province=...     -> phường/xã của 1 tỉnh
 */
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping("/provinces")
    public ApiResponse<List<String>> provinces() {
        return ApiResponse.ok("OK", VietnamProvinces.ALL);
    }

    @GetMapping("/wards")
    public ApiResponse<List<String>> wards(@RequestParam String province) {
        return ApiResponse.ok("OK", locationService.getWards(province));
    }
}
