package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.Evidence.FileType;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dữ liệu màn DUYỆT KẾT QUẢ XÁC MINH của Biên tập viên (GET /api/editor/submissions/{mã}/verification-review,
 * cũng là kết quả trả về của POST cùng đường dẫn).
 *
 * @param submission    tin gốc của người gửi (chi tiết hồ sơ như GET /api/editor/submissions/{mã})
 * @param priority      mức ưu tiên do Biên tập viên đánh giá; null nếu chưa đánh giá
 * @param impactScore   điểm tác động; null nếu chưa đánh giá
 * @param categoryName  chuyên mục (lĩnh vực) của hồ sơ; null nếu chưa gắn
 * @param deputyName    Phó Tổng biên tập phụ trách chuyên mục; null nếu chưa có
 * @param reporter      người gửi; null khi gửi ẩn danh
 * @param assignment    nhiệm vụ xác minh thực địa gần nhất; null nếu hồ sơ chưa được giao CTV
 * @param report        bài và báo cáo CTV nộp về; null nếu CTV chưa nộp
 * @param screening     kết quả sàng lọc tự động (tin rác, tin trùng, tóm tắt)
 * @param reviewable    true khi hồ sơ đang thẩm định và nhiệm vụ xác minh đã hoàn thành
 * @param blockedReason lý do chưa duyệt được; null khi reviewable = true
 * @param review        lần duyệt kết quả xác minh gần nhất; null nếu chưa duyệt
 */
public record VerificationReviewResponse(
        SubmissionDetail submission,
        Submission.Priority priority,
        Integer impactScore,
        String categoryName,
        String deputyName,
        Reporter reporter,
        Assignment assignment,
        Report report,
        Screening screening,
        boolean reviewable,
        String blockedReason,
        Review review) {

    public record Reporter(String fullName, User.Role role, Integer reputationScore) {
    }

    /**
     * @param contributorId   mã CTV nhận nhiệm vụ (null khi nhiệm vụ BROADCAST chưa có ai nhận)
     * @param contributorScore điểm hiệu suất của CTV
     * @param submittedAt     lúc CTV nộp bài (= thời điểm tạo bài CTV); null nếu chưa nộp
     * @param onTime          nộp trước hạn chót; null nếu chưa nộp hoặc nhiệm vụ không có hạn
     */
    public record Assignment(
            String title,
            FieldAssignment.AssignmentMode mode,
            FieldAssignment.AssignmentStatus status,
            String contributorId,
            String contributorName,
            Integer contributorScore,
            LocalDateTime assignedAt,
            LocalDateTime deadline,
            LocalDateTime submittedAt,
            Boolean onTime) {
    }

    /**
     * Bài CTV (submission loại CONTRIBUTOR_POST mà field_assignments.output_submission_id trỏ tới)
     * kèm kết luận trong báo cáo hiện trường (bảng field_reports).
     */
    public record Report(
            String title,
            String summary,
            String content,
            LocalDateTime createdAt,
            List<FieldEvidence> evidences,
            FieldReport.Conclusion conclusion,
            String findings,
            String witnessStatements,
            FieldReport.Recommendation recommendation) {
    }

    /**
     * 1 tệp CTV nộp. Toạ độ, giờ chụp, thiết bị đọc từ evidences.metadata (JSON) nếu lúc tải lên có ghi;
     * không có thì null và frontend hiện "Không có dữ liệu GPS".
     */
    public record FieldEvidence(
            String fileName,
            FileType fileType,
            long size,
            String url,
            Double latitude,
            Double longitude,
            String capturedAt,
            String device) {
    }

    /**
     * @param spam         submissions.is_spam
     * @param duplicateOf  mã hồ sơ gốc khi hệ thống đánh dấu trùng (submissions.duplicate_submission_id); null nếu không trùng
     * @param summary      submissions.ai_summary
     */
    public record Screening(boolean spam, String duplicateOf, String summary) {
    }

    /** @param comments kết quả từng tiêu chí + ghi chú gửi Phó TBT (editorial_reviews.comments, bỏ mã đánh dấu) */
    public record Review(LocalDateTime reviewedAt, String reviewerName, String comments) {
    }
}
