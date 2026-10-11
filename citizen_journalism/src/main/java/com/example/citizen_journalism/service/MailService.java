package com.example.citizen_journalism.service;

import com.example.citizen_journalism.exception.AppException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Gửi email HTML. Đây là nơi DUY NHẤT trong dự án gửi mail, mọi chức năng khác
 * (OTP, thông báo kết quả duyệt bài, khoá tài khoản...) đều gọi qua đây.
 *
 * HAI CHẾ ĐỘ (bật/tắt bằng biến môi trường MAIL_ENABLED, xem application.properties):
 *   - MAIL_ENABLED=false (mặc định khi code): KHÔNG gửi thật, chỉ in nội dung email ra console
 *     với dòng "[DEV MAIL]". Tại sao? Để cả nhóm test được ngay mà không cần tài khoản Gmail.
 *   - MAIL_ENABLED=true: gửi thật qua Gmail SMTP (cần MAIL_USERNAME + MAIL_PASSWORD là App Password).
 */
@Slf4j          // Lombok tạo sẵn biến "log" để ghi log ra console
@Service
@RequiredArgsConstructor
public class MailService {

    // ObjectProvider: lấy JavaMailSender "nếu có". Dùng thay cho tiêm trực tiếp để app không lỗi
    // khi chưa cấu hình mail.
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:}")
    private String from;

    /**
     * @param to      địa chỉ người nhận
     * @param subject tiêu đề
     * @param html    nội dung dạng HTML
     */
    public void send(String to, String subject, String html) {
        JavaMailSender sender = enabled ? mailSenderProvider.getIfAvailable() : null;

        // Chế độ phát triển: in ra console. Bỏ thẻ HTML cho dễ đọc (regex "<[^>]+>" = mọi thẻ <...>).
        if (sender == null) {
            log.info("\n===== [DEV MAIL] =====\nTo: {}\nSubject: {}\n{}\n======================",
                    to, subject, html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim());
            return;
        }

        // Chế độ thật: tạo email MIME hỗ trợ HTML + tiếng Việt (UTF-8) rồi gửi.
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            if (!from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true); // true = nội dung là HTML
            sender.send(message);
        } catch (MessagingException | MailException ex) {
            // Ghi chi tiết lỗi vào log cho lập trình viên, còn người dùng chỉ thấy thông báo thân thiện (503).
            log.error("Cannot send mail to {}", to, ex);
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Không gửi được email lúc này, vui lòng thử lại sau.");
        }
    }
}
