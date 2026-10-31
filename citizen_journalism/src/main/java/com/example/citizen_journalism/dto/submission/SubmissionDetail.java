package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;

/**
 * CHI TIẾT HỒ SƠ cho người gửi theo dõi. Dùng chung cho 2 cách xem:
 *   - Tra cứu bằng mã hồ sơ + PIN (POST /api/tracking, không cần đăng nhập)
 *   - Người gửi đã đăng nhập mở từ "Thông tin đã gửi" (GET /api/submissions/mine/{mã})
 *
 * KHÔNG chứa thông tin liên hệ (họ tên, SĐT, email, CMND) và không có id người gửi:
 * ai biết mã + PIN cũng chỉ xem được nội dung và tiến độ, không lộ danh tính người gửi.
 *
 * @param requestNote lời nhắn "Toà soạn đề nghị bổ sung"; chỉ có khi trạng thái là NEED_MORE_INFO, còn lại null
 * @param rejection   lý do + phản hồi khi hồ sơ bị từ chối (REJECTED), còn lại null. Người gửi xem thì không có
 *                    ghi chú nội bộ và tên Biên tập viên (xem RejectionInfo.forReporter)
 * @param timeline    nhật ký xử lý theo thứ tự thời gian (bước 1 là lúc gửi)
 */
public record SubmissionDetail(
        String trackingCode,
        ReportCategory category,
        String title,
        String summary,
        String content,
        LocalDateTime incidentAt,
        String province,
        String address,
        boolean anonymous,
        SubmissionStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String requestNote,
        RejectionInfo rejection,
        List<EvidenceInfo> evidences,
        List<TimelineEntry> timeline) {
}
