package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.notification.NotificationItem;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.FieldAssignment;
import com.example.citizen_journalism.entity.FieldReport;
import com.example.citizen_journalism.entity.FieldReportFeedback;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.NotificationReadRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationReadService {

    private final NotificationReadRepository repository;

    @Transactional(readOnly = true)
    public List<NotificationItem> getMine(String userId) {
        List<NotificationItem> result = new ArrayList<>();

        User.Role role = repository.roleOf(userId);

        // 1. Thông báo xử lý hồ sơ tin báo của người gửi.
        for (SubmissionEvent event : repository.submissionEvents(userId)) {
            // Không hiển thị kết quả AI và kiểm tra tin trùng nội bộ.
            if (DuplicateDetectionService.isInternalEvent(event)
                    || ImpactScoreService.isInternalEvent(event)) {
                continue;
            }

            String code = event.getSubmission().getTrackingCode();

            addItem(
                result,
                "submission-" + event.getId(),
                "SUBMISSION",
                code,
                event.getSubmission().getTitle(),
                event.getStatus().name(),
                event.getDescription(),
                event.getNote(),
                event.getCreatedAt(),
                code == null ? null : "/account/submissions/" + code
            );
        }

        // 2. Thông báo tiến trình đăng ký CTV của chính tài khoản.
        for (ContributorApplication app : repository.applications(userId)) {
            String prefix = "contributor-" + app.getId() + "-";
            String link = "/account/profile";

            add(
                result,
                prefix + "submitted",
                "PENDING_EDITOR",
                "Đã nộp đơn cộng tác viên",
                "Tòa soạn đã nhận đơn đăng ký cộng tác viên của bạn.",
                null,
                app.getCreatedAt(),
                link
            );

            if (app.getEditorReviewedAt() != null) {
                boolean forwarded =
                    app.getDeputyReviewedAt() != null
                    || app.getStatus() == ContributorApplication.Status.PENDING_DEPUTY
                    || app.getStatus() == ContributorApplication.Status.APPROVED;

                boolean editorRejected =
                    app.getStatus() == ContributorApplication.Status.REJECTED
                    && app.getDeputyReviewedAt() == null;

                if (forwarded) {
                    add(
                        result,
                        prefix + "editor",
                        "PENDING_DEPUTY",
                        "Đơn CTV đã chuyển lên Phó Tổng biên tập",
                        "Biên tập viên đã xét hồ sơ và chuyển đơn đến Phó Tổng biên tập.",
                        null,
                        app.getEditorReviewedAt(),
                        link
                    );
                } else if (editorRejected) {
                    add(
                        result,
                        prefix + "editor",
                        "REJECTED",
                        "Đơn CTV bị từ chối tại bước Biên tập viên",
                        "Biên tập viên đã từ chối đơn đăng ký cộng tác viên.",
                        app.getEditorNote(),
                        app.getEditorReviewedAt(),
                        link
                    );
                }
            }

            if (app.getDeputyReviewedAt() != null) {
                if (app.getStatus() == ContributorApplication.Status.APPROVED) {
                    add(
                        result,
                        prefix + "deputy",
                        "APPROVED",
                        "Đơn CTV đã được phê duyệt",
                        "Phó Tổng biên tập đã phê duyệt đơn đăng ký cộng tác viên.",
                        app.getDeputyNote(),
                        app.getDeputyReviewedAt(),
                        link
                    );
                } else if (app.getStatus() == ContributorApplication.Status.REJECTED) {
                    add(
                        result,
                        prefix + "deputy",
                        "REJECTED",
                        "Đơn CTV bị Phó Tổng biên tập từ chối",
                        "Phó Tổng biên tập đã từ chối đơn đăng ký cộng tác viên.",
                        app.getDeputyNote(),
                        app.getDeputyReviewedAt(),
                        link
                    );
                }
            }

            if (app.getWithdrawnAt() != null) {
                add(
                    result,
                    prefix + "withdrawn",
                    "WITHDRAWN",
                    "Bạn đã rút đơn cộng tác viên",
                    "Đơn cộng tác viên đã được rút trước khi Biên tập viên xét duyệt.",
                    null,
                    app.getWithdrawnAt(),
                    link
                );
            }
        }

        // 3. Thông báo nhiệm vụ và phản hồi dành cho CTV.
        if (role == User.Role.CONTRIBUTOR) {
            addContributorTaskNotifications(userId, result);
        }

        // 4. Thông báo báo cáo và phản hồi dành cho Biên tập viên.
        if (role == User.Role.EDITOR) {
            addEditorTaskNotifications(userId, result);
        }

        // 5. Thông báo bài nghiên cứu dành cho Chuyên gia.
        if (role == User.Role.EXPERT) {
            addExpertResearchNotifications(userId, result);
        }

        // 6. Thông báo hàng đợi bài nghiên cứu dành cho nhân sự duyệt bài.
        if (role == User.Role.EDITOR
                || role == User.Role.DEPUTY_EIC
                || role == User.Role.EIC) {

            addResearchQueueNotifications(userId, role, result);

            if (role == User.Role.EDITOR) {
                addEditorResearchResponses(userId, result);
            }
        }

        // Sắp xếp thông báo mới nhất lên đầu.
        result.sort(
            Comparator.comparing(
                NotificationItem::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder())
            )
        );

        return result.stream().limit(100).toList();
    }

    // =========================================================
    // THÔNG BÁO DÀNH CHO CỘNG TÁC VIÊN
    // =========================================================

    private void addContributorTaskNotifications(
            String userId,
            List<NotificationItem> result
    ) {
        for (FieldAssignment task : repository.contributorAssignments(userId)) {
            String code = task.getSubmission().getTrackingCode();
            String title = task.getSubmission().getTitle();
            String link = "/contributor/tasks/" + task.getId();

            LocalDateTime assignedAt = task.getClaimedAt() != null
                ? task.getClaimedAt()
                : task.getCreatedAt();

            addItem(
                result,
                "field-task-" + task.getId() + "-assigned",
                "FIELD_WORK",
                code,
                "Bạn được giao nhiệm vụ xác minh hiện trường",
                task.getStatus().name(),
                "Tòa soạn đã giao nhiệm vụ \"" + task.getTitle()
                    + "\" cho bạn. Hồ sơ: " + title + ".",
                task.getNote(),
                assignedAt,
                link
            );

            // Thông báo khi Biên tập viên thu hồi nhiệm vụ.
            if (task.getCancelType() == FieldAssignment.CancelType.EDITOR_CANCELLED) {
                addItem(
                    result,
                    "field-task-" + task.getId() + "-withdrawn",
                    "FIELD_WORK",
                    code,
                    "Nhiệm vụ xác minh đã được thu hồi",
                    "CANCELLED",
                    "Tòa soạn đã thu hồi nhiệm vụ xác minh hồ sơ \"" + title + "\".",
                    task.getCancelReason(),
                    task.getUpdatedAt(),
                    link
                );
            }
        }

        // Thông báo khi Biên tập viên yêu cầu sửa bài, bổ sung tư liệu hoặc duyệt.
        for (FieldReportFeedback feedback : repository.contributorFeedbacks(userId)) {
            FieldAssignment task = feedback.getReport().getAssignment();

            String code = task.getSubmission().getTrackingCode();
            String link = "/contributor/tasks/" + task.getId();

            String title;
            String message;
            String status;

            switch (feedback.getType()) {
                case REQUEST_REVISION -> {
                    title = "Tòa soạn yêu cầu sửa bài viết";
                    message = "Biên tập viên đã gửi yêu cầu chỉnh sửa bài viết của nhiệm vụ \""
                        + task.getTitle() + "\".";
                    status = "NEED_MORE_INFO";
                }

                case REQUEST_EVIDENCE -> {
                    title = "Tòa soạn yêu cầu bổ sung tư liệu";
                    message = "Biên tập viên yêu cầu bạn bổ sung tư liệu cho nhiệm vụ \""
                        + task.getTitle() + "\".";
                    status = "NEED_MORE_INFO";
                }

                default -> {
                    title = "Báo cáo xác minh đã được duyệt";
                    message = "Biên tập viên đã duyệt báo cáo xác minh của nhiệm vụ \""
                        + task.getTitle() + "\".";
                    status = "APPROVED";
                }
            }

            addItem(
                result,
                "field-feedback-" + feedback.getId(),
                "FIELD_WORK",
                code,
                title,
                status,
                message,
                feedback.getMessage(),
                feedback.getCreatedAt(),
                link
            );
        }
    }

    // =========================================================
    // THÔNG BÁO DÀNH CHO BIÊN TẬP VIÊN
    // =========================================================

    private void addEditorTaskNotifications(
            String editorId,
            List<NotificationItem> result
    ) {
        // CTV đã nộp báo cáo xác minh.
        for (FieldReport report : repository.reportsForEditor(editorId)) {
            FieldAssignment task = report.getAssignment();
            String code = task.getSubmission().getTrackingCode();

            addItem(
                result,
                "field-report-" + report.getId() + "-submitted",
                "FIELD_WORK",
                code,
                "Cộng tác viên đã nộp báo cáo xác minh",
                "COMPLETED",
                task.getContributor().getFullName()
                    + " đã nộp báo cáo cho hồ sơ " + code
                    + ". Bạn có thể mở báo cáo để xem kết quả và bài viết.",
                null,
                report.getCreatedAt(),
                "/editor/queue/" + code + "/verification"
            );
        }

        // CTV đã phản hồi yêu cầu chỉnh sửa hoặc bổ sung tư liệu.
        for (FieldReportFeedback feedback : repository.feedbackResponsesForEditor(editorId)) {
            FieldAssignment task = feedback.getReport().getAssignment();

            String action = feedback.getType() == FieldReportFeedback.Type.REQUEST_REVISION
                ? "sửa bài viết"
                : "bổ sung tư liệu";

            addItem(
                result,
                "field-feedback-response-" + feedback.getId(),
                "FIELD_WORK",
                task.getSubmission().getTrackingCode(),
                "Cộng tác viên đã phản hồi yêu cầu",
                "IN_REVIEW",
                task.getContributor().getFullName()
                    + " đã " + action
                    + " theo yêu cầu của bạn. Báo cáo đang chờ bạn xem lại.",
                feedback.getResponse(),
                feedback.getResolvedAt(),
                "/editor/queue/"
                    + task.getSubmission().getTrackingCode()
                    + "/verification"
            );
        }

        // CTV từ chối hoặc tự hủy nhiệm vụ.
        for (FieldAssignment task : repository.cancelledAssignmentsForEditor(editorId)) {
            String action = task.getCancelType() == FieldAssignment.CancelType.DECLINED
                ? "từ chối"
                : "huỷ";

            addItem(
                result,
                "field-task-" + task.getId() + "-cancelled-by-contributor",
                "FIELD_WORK",
                task.getSubmission().getTrackingCode(),
                "Cộng tác viên đã " + action + " nhiệm vụ",
                "CANCELLED",
                task.getContributor().getFullName()
                    + " đã " + action
                    + " nhiệm vụ xác minh hồ sơ "
                    + task.getSubmission().getTrackingCode()
                    + ". Bạn có thể giao nhiệm vụ cho CTV khác.",
                task.getCancelReason(),
                task.getUpdatedAt(),
                "/editor/queue/"
                    + task.getSubmission().getTrackingCode()
                    + "/assign"
            );
        }
    }

    // =========================================================
    // THÔNG BÁO DÀNH CHO CHUYÊN GIA
    // =========================================================

    private void addExpertResearchNotifications(
            String expertId,
            List<NotificationItem> result
    ) {
        // Bài nghiên cứu đã được Chuyên gia nộp.
        for (ResearchArticle article : repository.researchArticlesByAuthor(expertId)) {
            addItem(
                result,
                "research-" + article.getId() + "-submitted",
                "RESEARCH",
                "NC-" + article.getId(),
                "Đã nộp bài nghiên cứu",
                "SUBMITTED",
                "Bài nghiên cứu \"" + article.getTitle()
                    + "\" đã được gửi đến tòa soạn.",
                null,
                article.getSubmittedAt(),
                "/research/" + article.getId()
            );
        }

        // Lịch sử Biên tập viên và Ban biên tập xử lý bài nghiên cứu.
        for (EditoralReview review : repository.researchReviewsForAuthor(expertId)) {
            ResearchArticle article = review.getResearchArticle();
            String code = "NC-" + article.getId();
            String link = "/research/" + article.getId();

            if (review.getAction() == EditoralReview.ReviewAction.REQUEST_EDIT) {
                String reviewerRole = review.getReviewRole().name();

                String reviewerName = switch (reviewerRole) {
                    case "EDITOR" -> "Biên tập viên";
                    case "DEPUTY_EIC" -> "Phó Tổng biên tập";
                    case "EIC" -> "Tổng biên tập";
                    default -> "Ban biên tập";
                };

                addItem(
                    result,
                    "research-review-" + review.getId(),
                    "RESEARCH",
                    code,
                    "Bài nghiên cứu cần chỉnh sửa",
                    review.getStatus() == null
                        ? "PENDING"
                        : review.getStatus().name(),
                    reviewerName + " đã gửi đề xuất chỉnh sửa bài nghiên cứu \""
                        + article.getTitle()
                        + "\". Mở yêu cầu để xem nội dung và phản hồi.",
                    review.getComments(),
                    review.getCreatedAt(),
                    "/research/revisions/" + review.getId()
                );

            } else if (
                review.getReviewRole() == EditoralReview.ReviewRole.EDITOR
                && review.getAction() == EditoralReview.ReviewAction.APPROVE
            ) {
                addItem(
                    result,
                    "research-review-" + review.getId(),
                    "RESEARCH",
                    code,
                    "Bài nghiên cứu đã qua bước biên tập",
                    "DEPUTY_PENDING",
                    "Biên tập viên đã duyệt bài nghiên cứu \""
                        + article.getTitle()
                        + "\" và chuyển bài đến Ban biên tập.",
                    null,
                    review.getCreatedAt(),
                    link
                );

            } else if (review.getAction() == EditoralReview.ReviewAction.REJECT) {
                String status = switch (review.getReviewRole()) {
                    case EDITOR -> "REJECTED";
                    case DEPUTY_EIC -> "DEPUTY_REJECTED";
                    case EIC -> "EIC_REJECTED";
                };

                addItem(
                    result,
                    "research-review-" + review.getId(),
                    "RESEARCH",
                    code,
                    "Bài nghiên cứu không được duyệt",
                    status,
                    "Bài nghiên cứu \"" + article.getTitle()
                        + "\" đã bị từ chối ở bước "
                        + review.getReviewRole().name() + ".",
                    review.getComments(),
                    review.getCreatedAt(),
                    link
                );
            }
        }
    }

    // =========================================================
    // THÔNG BÁO HÀNG ĐỢI DÀNH CHO BIÊN TẬP VIÊN VÀ BAN BIÊN TẬP
    // =========================================================

    private void addResearchQueueNotifications(
            String userId,
            User.Role role,
            List<NotificationItem> result
    ) {
        Set<Long> alreadyNotifiedByLeadership = role == User.Role.EDITOR
            ? repository.leadershipResearchFeedbackForEditor(userId).stream()
                .map(review -> review.getResearchArticle().getId())
                .collect(Collectors.toSet())
            : Set.of();

        for (ResearchArticle article : repository.researchQueue(userId, role)) {
            // Tránh hiển thị trùng thông báo bài bị Ban biên tập trả về.
            if (alreadyNotifiedByLeadership.contains(article.getId())) {
                continue;
            }

            String code = "NC-" + article.getId();
            String title;
            String message;
            String link;
            String status;

            if (role == User.Role.EDITOR) {
                title = "Bài nghiên cứu đang chờ Biên tập viên xử lý";
                message = "Bài nghiên cứu \"" + article.getTitle()
                    + "\" của Chuyên gia "
                    + article.getAuthor().getFullName()
                    + " đang chờ Biên tập viên xem xét.";
                link = "/editor/queue/research/" + article.getId();
                status = "PENDING_EDITOR";

            } else if (role == User.Role.DEPUTY_EIC) {
                title = "Bài nghiên cứu đang chờ Phó Tổng biên tập duyệt";
                message = "Bài nghiên cứu \"" + article.getTitle()
                    + "\" đã được Biên tập viên chuyển đến hàng đợi duyệt của bạn.";
                link = "/leadership/research/" + article.getId();
                status = "DEPUTY_PENDING";

            } else {
                title = "Bài nghiên cứu Breaking đang chờ Tổng biên tập duyệt";
                message = "Bài nghiên cứu \"" + article.getTitle()
                    + "\" đã được chuyển đến hàng đợi duyệt của bạn.";
                link = "/leadership/research/" + article.getId();
                status = "EIC_PENDING";
            }

            LocalDateTime notificationTime = article.getUpdatedAt() == null
                ? article.getSubmittedAt()
                : article.getUpdatedAt();

            addItem(
                result,
                "research-queue-" + role.name() + "-" + article.getId()
                    + "-" + notificationTime,
                "RESEARCH",
                code,
                title,
                status,
                message,
                null,
                notificationTime,
                link
            );
        }
    }

    // Biên tập viên nhận phản hồi từ Chuyên gia và Ban biên tập.
    private void addEditorResearchResponses(
            String editorId,
            List<NotificationItem> result
    ) {
        for (EditoralReview review : repository.researchRevisionResponsesForEditor(editorId)) {
            ResearchArticle article = review.getResearchArticle();

            boolean accepted =
                review.getStatus() == EditoralReview.RequestStatus.ACCEPTED;

            addItem(
                result,
                "research-revision-response-" + review.getId(),
                "RESEARCH",
                "NC-" + article.getId(),
                accepted
                    ? "Chuyên gia đã đồng ý đề xuất chỉnh sửa"
                    : "Chuyên gia đã từ chối đề xuất chỉnh sửa",
                review.getStatus().name(),
                "Chuyên gia đã " + (accepted ? "đồng ý" : "từ chối")
                    + " đề xuất chỉnh sửa bài nghiên cứu \""
                    + article.getTitle() + "\".",
                null,
                review.getUpdatedAt() == null
                    ? review.getCreatedAt()
                    : review.getUpdatedAt(),
                "/editor/queue/research/" + article.getId()
            );
        }

        for (EditoralReview review : repository.leadershipResearchFeedbackForEditor(editorId)) {
            ResearchArticle article = review.getResearchArticle();

            boolean requestedEdit =
                review.getAction() == EditoralReview.ReviewAction.REQUEST_EDIT;

            addItem(
                result,
                "research-leadership-feedback-" + review.getId(),
                "RESEARCH",
                "NC-" + article.getId(),
                requestedEdit
                    ? "Ban biên tập yêu cầu chỉnh sửa bài nghiên cứu"
                    : "Ban biên tập không duyệt bài nghiên cứu",
                review.getAction().name(),
                requestedEdit
                    ? "Ban biên tập đã trả bài nghiên cứu \""
                        + article.getTitle()
                        + "\" về để Biên tập viên xử lý chỉnh sửa."
                    : "Ban biên tập đã quyết định không duyệt bài nghiên cứu \""
                        + article.getTitle() + "\".",
                review.getComments(),
                review.getCreatedAt(),
                "/editor/queue/research/" + article.getId()
            );
        }
    }

    // =========================================================
    // HÀM DÙNG CHUNG
    // =========================================================

    private void add(
            List<NotificationItem> items,
            String id,
            String status,
            String title,
            String message,
            String note,
            LocalDateTime time,
            String link
    ) {
        addItem(
            items,
            id,
            "CONTRIBUTOR",
            null,
            title,
            status,
            message,
            note,
            time,
            link
        );
    }

    private void addItem(
            List<NotificationItem> items,
            String id,
            String type,
            String trackingCode,
            String title,
            String status,
            String message,
            String note,
            LocalDateTime time,
            String link
    ) {
        if (time != null) {
            items.add(new NotificationItem(
                id,
                type,
                trackingCode,
                title,
                status,
                message,
                note,
                time,
                link
            ));
        }
    }
}