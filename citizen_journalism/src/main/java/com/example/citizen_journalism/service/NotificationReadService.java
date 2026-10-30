
package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.notification.NotificationItem;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.repository.NotificationReadRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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

        // 1. Thông báo từ lịch sử xử lý hồ sơ tin báo.
        for (SubmissionEvent event : repository.submissionEvents(userId)) {
            String code = event.getSubmission().getTrackingCode();

            result.add(new NotificationItem(
                "submission-" + event.getId(),
                "SUBMISSION",
                code,
                event.getSubmission().getTitle(),
                event.getStatus().name(),
                event.getDescription(),
                event.getNote(),
                event.getCreatedAt(),
                code == null ? null : "/account/submissions/" + code
            ));
        }

        // 2. Thông báo từ tiến trình đăng ký cộng tác viên.
        for (ContributorApplication app : repository.applications(userId)) {
            String prefix = "contributor-" + app.getId() + "-";
            String link = "/account/profile";

            // Bước nộp đơn: dựa trên thời điểm tạo đơn.
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

            // Bước Biên tập viên xét duyệt.
            if (app.getEditorReviewedAt() != null) {
                boolean forwarded =
                    app.getDeputyReviewedAt() != null
                    || app.getStatus()
                        == ContributorApplication.Status.PENDING_DEPUTY
                    || app.getStatus()
                        == ContributorApplication.Status.APPROVED;

                boolean editorRejected =
                    app.getStatus()
                        == ContributorApplication.Status.REJECTED
                    && app.getDeputyReviewedAt() == null;

                if (forwarded) {
                    add(
                        result,
                        prefix + "editor",
                        "PENDING_DEPUTY",
                        "Đơn CTV đã chuyển lên Phó Tổng biên tập",
                        "Biên tập viên đã xét hồ sơ và chuyển đơn "
                            + "đến Phó Tổng biên tập.",
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
                        "Biên tập viên đã từ chối đơn đăng ký "
                            + "cộng tác viên.",
                        app.getEditorNote(),
                        app.getEditorReviewedAt(),
                        link
                    );
                }
            }

            // Bước Phó Tổng biên tập xét duyệt.
            if (app.getDeputyReviewedAt() != null) {
                if (
                    app.getStatus()
                    == ContributorApplication.Status.APPROVED
                ) {
                    add(
                        result,
                        prefix + "deputy",
                        "APPROVED",
                        "Đơn CTV đã được phê duyệt",
                        "Phó Tổng biên tập đã phê duyệt "
                            + "đơn đăng ký cộng tác viên.",
                        app.getDeputyNote(),
                        app.getDeputyReviewedAt(),
                        link
                    );
                } else if (
                    app.getStatus()
                    == ContributorApplication.Status.REJECTED
                ) {
                    add(
                        result,
                        prefix + "deputy",
                        "REJECTED",
                        "Đơn CTV bị Phó Tổng biên tập từ chối",
                        "Phó Tổng biên tập đã từ chối "
                            + "đơn đăng ký cộng tác viên.",
                        app.getDeputyNote(),
                        app.getDeputyReviewedAt(),
                        link
                    );
                }
            }

            // Trường hợp người dùng rút đơn.
            if (app.getWithdrawnAt() != null) {
                add(
                    result,
                    prefix + "withdrawn",
                    "WITHDRAWN",
                    "Bạn đã rút đơn cộng tác viên",
                    "Đơn cộng tác viên đã được rút "
                        + "trước khi Biên tập viên xét duyệt.",
                    null,
                    app.getWithdrawnAt(),
                    link
                );
            }
        }

        // Mới nhất đứng đầu.
        result.sort(
            Comparator.comparing(
                NotificationItem::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder())
            )
        );

        return result.stream().limit(100).toList();
    }

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
        if (time != null) {
            items.add(new NotificationItem(
                id,
                "CONTRIBUTOR",
                null,
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
