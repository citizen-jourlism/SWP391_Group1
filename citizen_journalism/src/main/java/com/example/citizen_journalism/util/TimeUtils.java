package com.example.citizen_journalism.util;

import java.time.Duration;
import java.time.LocalDateTime;

/** Hàm xử lý thời gian dùng lại ở nhiều service (khoá tạm đăng nhập, khoá tạm tra cứu hồ sơ...). */
public final class TimeUtils {

    private TimeUtils() {
    }

    /**
     * Số phút còn lại (LÀM TRÒN LÊN, tối thiểu 1) từ now tới until, để hiện "thử lại sau X phút".
     * Ví dụ còn 4 phút 10 giây -> 5; còn đúng 15 phút -> 15.
     */
    public static long minutesUntil(LocalDateTime now, LocalDateTime until) {
        return Math.max(1, (Duration.between(now, until).getSeconds() + 59) / 60);
    }
}
