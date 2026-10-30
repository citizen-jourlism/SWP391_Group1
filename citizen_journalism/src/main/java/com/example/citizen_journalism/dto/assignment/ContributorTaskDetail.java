package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.Submission;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Chi tiết 1 nhiệm vụ cho Cộng tác viên đang được giao.
 *
 * KHÔNG chứa thông tin của người gửi (họ tên, SĐT, email, ẩn danh hay không) để bảo vệ nguồn tin.
 *
 * @param content   nội dung chi tiết; null cho tới khi CTV nhận nhiệm vụ
 * @param evidences tư liệu người gửi nộp; rỗng cho tới khi CTV nhận nhiệm vụ
 */
public record ContributorTaskDetail(
        Long id,
        String trackingCode,
        String title,
        Submission.ReportCategory category,
        String summary,
        LocalDateTime incidentAt,
        String province,
        String address,
        String note,
        FieldAssignment.AssignmentStatus status,
        FieldAssignment.CancelType cancelType,
        String cancelReason,
        LocalDateTime deadline,
        LocalDateTime claimedAt,
        LocalDateTime createdAt,
        String content,
        List<EvidenceInfo> evidences) {

    public static ContributorTaskDetail from(FieldAssignment task, String content, List<EvidenceInfo> evidences) {
        Submission submission = task.getSubmission();
        return new ContributorTaskDetail(
                task.getId(),
                submission.getTrackingCode(),
                submission.getTitle(),
                submission.getReportCategory(),
                submission.getSummary(),
                submission.getIncidentAt(),
                submission.getProvince(),
                submission.getAddress(),
                task.getNote(),
                task.getStatus(),
                task.getCancelType(),
                task.getCancelReason(),
                task.getDeadline(),
                task.getClaimedAt(),
                task.getCreatedAt(),
                content,
                evidences);
    }
}
