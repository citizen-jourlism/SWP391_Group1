package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;

/**
 * "BIÊN NHẬN" trả về ngay sau khi gửi tin / khiếu nại thành công.
 *
 * - trackingCode + pin: dùng để tra cứu tiến độ. PIN chỉ xuất hiện DUY NHẤT ở đây
 *   (và trong email biên nhận); DB chỉ lưu bản băm nên sau này không ai xem lại được.
 * - notifiedEmail  : email đã nhận biên nhận (để màn hình báo "Đã gửi mã tới ...").
 * - printedToConsole: true khi máy chủ đang ở chế độ phát triển (email chỉ in ra console, không gửi thật).
 */
public record SubmissionReceipt(
        Long id,
        String trackingCode,
        String pin,
        ReportCategory category,
        String title,
        SubmissionStatus status,
        boolean anonymous,
        LocalDateTime createdAt,
        String notifiedEmail,
        boolean printedToConsole,
        List<EvidenceInfo> evidences) {
}
