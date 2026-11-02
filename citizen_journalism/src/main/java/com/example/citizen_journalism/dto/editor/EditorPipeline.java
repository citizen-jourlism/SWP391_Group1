package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReportFeedback.ReviewStatus;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dữ liệu trang TIẾN ĐỘ TOÀ SOẠN của Biên tập viên (GET /api/editor/pipeline).
 * Bảng theo cột: mỗi cột là một bước xử lý, mỗi thẻ là một hồ sơ đang nằm ở bước đó.
 * Cách xếp hồ sơ vào cột nằm ở EditorPipelineService.stageOf.
 *
 * KHÔNG có thông tin người gửi: bảng này ai trong toà soạn cũng lướt qua được, cần bảo vệ nguồn tin như hàng đợi.
 *
 * @param columns      đủ các bước theo thứ tự Stage, kể cả bước đang trống
 * @param totalOpen    tổng số hồ sơ đang xử lý
 * @param overdueTasks số nhiệm vụ CTV đã quá hạn mà chưa nộp báo cáo
 */
public record EditorPipeline(List<Column> columns, long totalOpen, long overdueTasks) {

    /** Các bước xử lý, theo đúng thứ tự trên bảng. Nhãn hiển thị ở frontend: lib/pipeline.js. */
    public enum Stage {
        RECEIVED,
        SCREENING,
        NEED_INFO,
        FIELD_WORK,
        REPORT_REVIEW,
        LEADERSHIP,
        READY_TO_PUBLISH
    }

    /**
     * Một cột trên bảng.
     *
     * @param total tổng số hồ sơ ở bước này; có thể lớn hơn số thẻ vì mỗi cột chỉ trả một số thẻ giới hạn
     * @param cards các hồ sơ gửi sớm nhất, tức đã chờ lâu nhất
     */
    public record Column(Stage stage, int total, List<Card> cards) {
    }

    /**
     * Một hồ sơ trên bảng.
     *
     * @param editorName tên Biên tập viên phụ trách; null nếu chưa có ai nhận
     * @param task       nhiệm vụ mới nhất của hồ sơ; null nếu chưa từng giao Cộng tác viên
     */
    public record Card(
            String trackingCode,
            String title,
            Submission.ReportCategory category,
            Submission.SubmissionStatus status,
            String province,
            String editorName,
            Task task,
            LocalDateTime createdAt) {

        public static Card from(Submission submission, Task task) {
            User editor = submission.getAssignedEditor();
            return new Card(
                    submission.getTrackingCode(),
                    submission.getTitle(),
                    submission.getReportCategory(),
                    submission.getStatus(),
                    submission.getProvince(),
                    editor == null ? null : editor.getFullName(),
                    task,
                    submission.getCreatedAt());
        }
    }

    /**
     * Tóm tắt nhiệm vụ trên thẻ hồ sơ. Tên các trường khớp với lib/assignment.js để dùng lại nhãn và kiểm tra quá hạn.
     *
     * @param reviewStatus trạng thái xem xét báo cáo; null nếu chưa nộp báo cáo
     */
    public record Task(
            String contributorName,
            FieldAssignment.AssignmentStatus status,
            FieldAssignment.CancelType cancelType,
            ReviewStatus reviewStatus,
            LocalDateTime deadline) {

        public static Task from(FieldAssignment task, ReviewStatus reviewStatus) {
            return new Task(task.getContributor().getFullName(), task.getStatus(), task.getCancelType(), reviewStatus,
                    task.getDeadline());
        }
    }
}
