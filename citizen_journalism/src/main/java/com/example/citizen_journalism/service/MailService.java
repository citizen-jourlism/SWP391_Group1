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
 * Gửi email HTML.
 * Khi app.mail.enabled=false (mặc định lúc phát triển), email chỉ được in ra console
 * để có thể test mà không cần cấu hình Gmail.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:}")
    private String from;

    public void send(String to, String subject, String html) {
        JavaMailSender sender = enabled ? mailSenderProvider.getIfAvailable() : null;
        if (sender == null) {
            log.info("\n===== [DEV MAIL] =====\nTo: {}\nSubject: {}\n{}\n======================",
                    to, subject, html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim());
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            if (!from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(message);
        } catch (MessagingException | MailException ex) {
            log.error("Cannot send mail to {}", to, ex);
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Không gửi được email lúc này, vui lòng thử lại sau.");
        }
    }
}
