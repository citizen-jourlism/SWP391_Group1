package com.example.citizen_journalism.dto.assignment;

import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.entity.FieldReport;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Báo cáo hiện trường đã nộp, Cộng tác viên và Biên tập viên cùng xem.
 *
 * @param title     tiêu đề bài viết nháp
 * @param content   nội dung bài viết nháp
 * @param evidences tư liệu CTV nộp kèm báo cáo
 * @param late      nộp sau hạn hoàn thành
 */
public record FieldReportView(
        FieldReport.Conclusion conclusion,
        String findings,
        String witnessStatements,
        FieldReport.Recommendation recommendation,
        String title,
        String content,
        List<EvidenceInfo> evidences,
        LocalDateTime submittedAt,
        boolean late) {
}
