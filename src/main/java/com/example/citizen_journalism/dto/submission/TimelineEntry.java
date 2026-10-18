package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.SubmissionEvent.Actor;
import java.time.LocalDateTime;

/** Một bước trong "Nhật ký xử lý" của hồ sơ. Xem entity SubmissionEvent. */
public record TimelineEntry(
        SubmissionStatus status,
        Actor actor,
        String description,
        String note,
        LocalDateTime createdAt) {

    public static TimelineEntry from(SubmissionEvent event) {
        return new TimelineEntry(event.getStatus(), event.getActor(), event.getDescription(), event.getNote(),
                event.getCreatedAt());
    }
}
