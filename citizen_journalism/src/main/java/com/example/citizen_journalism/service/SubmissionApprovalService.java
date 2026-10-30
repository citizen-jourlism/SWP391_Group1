package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.ApproveSubmissionResponse;
import com.example.citizen_journalism.dto.editor.ApproveSubmissionRequest;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EditorialReviewRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.TextUtils;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * DUYỆT TIN NÓNG (Approve Breaking News) — Biên tập viên duyệt tin nóng đạt yêu cầu và chuyển lên
 * Phó Tổng biên tập phê duyệt tiếp.
 * API: EditorController (GET /api/editor/submissions/{mã}/approval, POST .../approve).
 * Frontend: nút "Duyệt & chuyển Phó TBT" ở routes/editor/EditorSubmissionDetail.jsx
 * (hộp thoại components/editor/ApproveSubmissionDialog.jsx).
 *
 * KHÔNG cần thêm cột / bảng mới (DEPUTY_PENDING và APPROVE đã có sẵn trong enum). Khi duyệt, ghi:
 *   - submissions.status = DEPUTY_PENDING + 1 bước nhật ký (SubmissionEventService.record):
 *       actor EDITOR, description "Biên tập viên đã duyệt tin, chuyển Phó Tổng biên tập phê duyệt.", không có note
 *   - submissions.assigned_editor_id = Biên tập viên duyệt (nếu hồ sơ chưa có BTV phụ trách), để Phó TBT biết
 *     trả bài về cho ai khi cần sửa
 *   - editorial_reviews: review_role EDITOR, action APPROVE, comments = ghi chú gửi Phó TBT (người gửi không thấy)
 * Ghi chú cho Phó TBT KHÔNG để ở note của nhật ký vì người gửi đọc được toàn bộ nhật ký.
 */
@Service
@RequiredArgsConstructor
public class SubmissionApprovalService {

    public static final String EVENT_DESCRIPTION = "Biên tập viên đã duyệt tin, chuyển Phó Tổng biên tập phê duyệt.";

    /**
     * Chỉ duyệt được hồ sơ ĐANG THẨM ĐỊNH (đã có Biên tập viên tiếp nhận qua nút "Tiếp nhận thẩm định").
     * Hồ sơ mới (PENDING) phải tiếp nhận trước; đang "Cần bổ sung" thì phải chờ người gửi trả lời.
     */
    private static final Set<SubmissionStatus> APPROVABLE_STATUSES = Set.of(SubmissionStatus.IN_REVIEW);

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final EditorialReviewRepository reviewRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;

    /** Dữ liệu hộp thoại Duyệt tin: chi tiết hồ sơ, có duyệt được không, Phó TBT phụ trách, lần duyệt đã lưu. */
    @Transactional(readOnly = true)
    public ApproveSubmissionResponse getContext(String trackingCode) {
        return toContext(findSubmission(trackingCode));
    }

    @Transactional
    public ApproveSubmissionResponse approve(String editorId, String trackingCode, ApproveSubmissionRequest request) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        String blockedReason = blockedReasonOf(submission);
        if (blockedReason != null) {
            throw AppException.conflict(blockedReason);
        }

        eventService.record(submission, SubmissionStatus.DEPUTY_PENDING, SubmissionEvent.Actor.EDITOR,
                EVENT_DESCRIPTION, null);
        if (submission.getAssignedEditor() == null) {
            submission.setAssignedEditor(editor); // JPA tự ghi xuống DB khi kết thúc transaction
        }
        reviewRepository.save(EditoralReview.builder()
                .submission(submission)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(EditoralReview.ReviewAction.APPROVE)
                .comments(TextUtils.blankToNull(request.note()))
                .build());
        return toContext(submission);
    }

    // ================================ HÀM PHỤ ================================

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    /** Lý do không duyệt được; null = duyệt được. Khiếu nại / phóng sự đi luồng khác nên không duyệt ở đây. */
    private String blockedReasonOf(Submission submission) {
        if (submission.getType() != Submission.SubmissionType.HOT_NEWS) {
            return "Chỉ hồ sơ tin nóng mới được duyệt chuyển Phó Tổng biên tập.";
        }
        if (!APPROVABLE_STATUSES.contains(submission.getStatus())) {
            return "Chỉ duyệt được hồ sơ đang thẩm định. Hồ sơ mới cần được tiếp nhận thẩm định trước.";
        }
        return null;
    }

    private ApproveSubmissionResponse toContext(Submission submission) {
        SubmissionDetail detail = trackingService.getForStaff(submission.getTrackingCode());
        String blockedReason = blockedReasonOf(submission);
        return new ApproveSubmissionResponse(detail, blockedReason == null, blockedReason, deputyNameOf(submission),
                approvalOf(submission));
    }

    private String deputyNameOf(Submission submission) {
        Category category = submission.getCategory();
        if (category == null || category.getDeputyEic() == null) {
            return null;
        }
        return category.getDeputyEic().getFullName();
    }

    /** Lần Biên tập viên duyệt gần nhất (editorial_reviews APPROVE do EDITOR ghi). */
    private ApproveSubmissionResponse.Approval approvalOf(Submission submission) {
        return reviewRepository
                .findFirstBySubmissionAndActionOrderByCreatedAtDescIdDesc(submission, EditoralReview.ReviewAction.APPROVE)
                .filter(review -> review.getReviewRole() == EditoralReview.ReviewRole.EDITOR)
                .map(review -> new ApproveSubmissionResponse.Approval(
                        review.getCreatedAt(),
                        review.getReviewer() == null ? null : review.getReviewer().getFullName(),
                        review.getComments()))
                .orElse(null);
    }
}
