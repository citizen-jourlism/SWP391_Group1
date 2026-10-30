package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TIẾP NHẬN THẨM ĐỊNH — Biên tập viên nhận xử lý một hồ sơ mới: hồ sơ chuyển từ "Đã tiếp nhận" (PENDING)
 * sang "Đang thẩm định" (IN_REVIEW) và BTV đó trở thành người phụ trách hồ sơ.
 * API: EditorController (POST /api/editor/submissions/{mã}/start-review).
 * Frontend: nút "Tiếp nhận thẩm định" ở routes/editor/EditorSubmissionDetail.jsx.
 *
 * KHÔNG cần thêm cột / bảng mới. Khi tiếp nhận, ghi:
 *   - submissions.assigned_editor_id = Biên tập viên đang đăng nhập
 *   - submissions.status = IN_REVIEW + 1 bước nhật ký (SubmissionEventService.record):
 *       actor EDITOR, description "Biên tập viên đã tiếp nhận, hồ sơ đang được thẩm định.", không có note
 * Không ghi editorial_reviews vì đây chưa phải là một quyết định duyệt / từ chối.
 */
@Service
@RequiredArgsConstructor
public class SubmissionReviewStartService {

    public static final String EVENT_DESCRIPTION = "Biên tập viên đã tiếp nhận, hồ sơ đang được thẩm định.";

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;

    @Transactional
    public SubmissionDetail startReview(String editorId, String trackingCode) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
        // Chỉ hồ sơ mới (chưa ai nhận) mới tiếp nhận được; cũng chặn 2 BTV cùng bấm nhận 1 hồ sơ
        if (submission.getStatus() != SubmissionStatus.PENDING) {
            throw AppException.conflict("Hồ sơ không còn ở trạng thái Đã tiếp nhận, không thể tiếp nhận thẩm định.");
        }

        submission.setAssignedEditor(editor); // JPA tự ghi xuống DB khi kết thúc transaction
        eventService.record(submission, SubmissionStatus.IN_REVIEW, SubmissionEvent.Actor.EDITOR,
                EVENT_DESCRIPTION, null);
        return trackingService.getForStaff(submission.getTrackingCode());
    }
}
