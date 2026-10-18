package com.example.citizen_journalism.dto.submission;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu form TRA CỨU HỒ SƠ: mã hồ sơ (tối đa 20 ký tự, ví dụ KB-2026-0001) + mã PIN 6 số.
 * Gửi bằng POST (trong body) chứ không để trên đường dẫn, để mã PIN không bị lưu vào lịch sử trình duyệt / log máy chủ.
 */
public record TrackRequest(
        @NotBlank(message = "Vui lòng nhập mã hồ sơ.")
        @Size(max = 20, message = "Mã hồ sơ tối đa 20 ký tự.")
        String trackingCode,

        @NotBlank(message = "Vui lòng nhập mã PIN.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã PIN gồm đúng 6 chữ số.")
        String pin) {
}
