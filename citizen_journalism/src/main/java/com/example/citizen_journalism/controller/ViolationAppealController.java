package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.violation.AppealReceipt;
import com.example.citizen_journalism.dto.violation.AppealStatusRequest;
import com.example.citizen_journalism.dto.violation.CreateAppealRequest;
import com.example.citizen_journalism.dto.violation.ViolationAppealView;
import com.example.citizen_journalism.service.ViolationAppealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appeals")
@RequiredArgsConstructor
public class ViolationAppealController {

    private final ViolationAppealService appealService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AppealReceipt> create(@Valid @RequestBody CreateAppealRequest request) {
        return ApiResponse.ok("Đã gửi khiếu nại mở khóa. Hồ sơ sẽ được Biên tập viên xem xét.",
                AppealReceipt.from(appealService.create(request)));
    }

    @PostMapping("/status")
    public ApiResponse<ViolationAppealView> status(@Valid @RequestBody AppealStatusRequest request) {
        return ApiResponse.ok("OK", appealService.getOwn(request));
    }
}
