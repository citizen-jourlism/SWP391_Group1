
package com.example.citizen_journalism.controller;

import com.example.citizen_journalism.dto.ApiResponse;
import com.example.citizen_journalism.dto.notification.NotificationItem;
import com.example.citizen_journalism.service.NotificationReadService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notification-history")
@RequiredArgsConstructor
public class NotificationReadController {

    private final NotificationReadService service;

    @GetMapping("/mine")
    public ApiResponse<List<NotificationItem>> mine(
            @AuthenticationPrincipal Jwt jwt) {

        return ApiResponse.ok(
                "OK",
                service.getMine(jwt.getSubject())
        );
    }
}
