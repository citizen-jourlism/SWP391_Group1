package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.job.UserPerformanceJob;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class UserPerformanceController {
    private final UserPerformanceJob job;
    @GetMapping({"/api/editor/performance", "/api/admin/performance"})
    public ApiResponse<List<UserPerformanceJob.PerformanceSnapshot>> evaluate() {
        return ApiResponse.ok("Đánh giá từ dữ liệu mới nhất.", job.evaluate());
    }
}
