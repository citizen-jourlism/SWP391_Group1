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
import org.springframework.web.util.HtmlUtils;

/**
 * Gửi email HTML. Đây là nơi DUY NHẤT trong dự án gửi mail, mọi chức năng khác
 * (OTP, biên nhận hồ sơ, kết quả xét đơn Cộng tác viên...) đều gọi qua đây.
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
     * true nếu email đang được GỬI THẬT; false nếu chỉ in ra console (chế độ phát triển).
     * OtpService dùng để báo cho frontend biết có nên hiện gợi ý "xem mã OTP trong log backend" hay không.
     */
    public boolean isLiveDelivery() {
        return enabled && mailSenderProvider.getIfAvailable() != null;
    }

    /**
     * KHUNG CHUNG của mọi email (tên toà soạn, viền, font chữ). Các chức năng chỉ cần viết phần nội dung riêng,
     * nhờ vậy email nào cũng cùng một kiểu và không phải chép lại đoạn HTML khung ở nhiều nơi.
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
     * "Vô hiệu hoá" mã HTML trong chữ do người dùng nhập trước khi đặt vào email:
     * nếu ai đó cố gõ thẻ HTML (ví dụ đường link lừa đảo) thì chỉ hiện ra như chữ thường, không chạy được.
     * "UTF-8": chỉ đổi các ký tự đặc biệt của HTML (< > & " '), giữ nguyên chữ có dấu tiếng Việt cho dễ đọc.
     */
    public static String escape(String text) {
        return HtmlUtils.htmlEscape(text, "UTF-8");
    }

    /** Ô nền xám làm nổi một đoạn trong email (lý do, chỉ dẫn...). Chữ do người dùng nhập phải được bọc escape() trước. */
    public static String box(String html) {
        return "<p style=\"padding:12px 16px;background:#f5f7fb;border-radius:8px\">" + html + "</p>";
    }

    /**
     * Gửi email nhưng KHÔNG ném lỗi: gửi hỏng thì chỉ ghi log và trả về false.
     * Dùng cho email THÔNG BÁO (biên nhận hồ sơ, kết quả xét đơn...): thao tác chính đã lưu thành công rồi,
     * không được báo lỗi chỉ vì máy chủ mail đang trục trặc.
     * Email OTP thì dùng send(): gửi lỗi phải báo ngay để người dùng bấm gửi lại.
     */
    public boolean trySend(String to, String subject, String html) {
        try {
            send(to, subject, html);
            return true;
        } catch (AppException ex) {
            log.warn("Cannot send mail \"{}\" to {}", subject, to);
            return false;
        }
    }

    /**
     * @param to      địa chỉ người nhận
     * @param subject tiêu đề
     * @param html    nội dung dạng HTML
     */
    public void send(String to, String subject, String html) {
        JavaMailSender sender = isLiveDelivery() ? mailSenderProvider.getIfAvailable() : null;

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
