package com.example.citizen_journalism.service;

import com.example.citizen_journalism.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Email THÔNG BÁO cho người gửi hồ sơ (từ chối hồ sơ, yêu cầu bổ sung thông tin...).
 * Việc gửi thật vẫn đi qua MailService.send; lớp này chỉ thêm khung HTML chung, escape chữ người dùng nhập
 * và cách gửi "không ném lỗi". Tách riêng để không phải sửa MailService (file chung của nhóm).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationMailService {

    private final MailService mailService;

    /**
     * KHUNG CHUNG của email thông báo (tên toà soạn, viền, font chữ).
     *
     * @param body nội dung riêng của email. Chữ do người dùng nhập (họ tên, tiêu đề...) phải được bọc escape()
     *             trước, để không ai chèn được mã HTML vào email.
     */
    public static String layout(String body) {
        return """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;
                            border:1px solid #dfe5ef;border-radius:12px;color:#172339">
                  <h2 style="margin:0 0 4px;color:#0d1f35">TIN NÓNG DÂN SINH</h2>
                %s
                </div>
                """.formatted(body);
    }

    /**
     * "Vô hiệu hoá" mã HTML trong chữ do người dùng nhập trước khi đặt vào email.
     * "UTF-8": chỉ đổi các ký tự đặc biệt của HTML (< > & " '), giữ nguyên chữ có dấu tiếng Việt.
     */
    public static String escape(String text) {
        return HtmlUtils.htmlEscape(text, "UTF-8");
    }

    /**
     * Gửi email nhưng KHÔNG ném lỗi: gửi hỏng thì chỉ ghi log và trả về false.
     * Thao tác chính (từ chối, yêu cầu bổ sung...) đã lưu thành công rồi, không được báo lỗi chỉ vì máy chủ mail trục trặc.
     */
    public boolean trySend(String to, String subject, String html) {
        try {
            mailService.send(to, subject, html);
            return true;
        } catch (AppException ex) {
            log.warn("Cannot send mail \"{}\" to {}", subject, to);
            return false;
        }
    }
}
