package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.LeadershipRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * BIÊN TẬP VIÊN SỬA TRỰC TIẾP NỘI DUNG HỒ SƠ (tin nóng / khiếu nại / phóng sự) — ngay trên trang chi tiết hồ sơ
 * của BTV (EditorSubmissionDetail, nút "Sửa bài"), không có màn hình riêng.
 * Luồng: EditorSubmissionDetail -> components/editor/SubmissionEditPanel -> submissionEditService.editContent
 *        -> PUT /api/editor/submissions/{mã}/content (SubmissionEditController) -> service này.
 *
 * Khác bài nghiên cứu: KHÔNG cần người gửi xác nhận, lưu thẳng vào hồ sơ. Thường dùng khi Ban biên tập
 * "Yêu cầu chỉnh sửa" trả hồ sơ về BTV (hồ sơ về IN_REVIEW), BTV sửa xong rồi duyệt lại như bình thường.
 *
 * Chỉ sửa được khi hồ sơ ĐANG THẨM ĐỊNH (IN_REVIEW) — đúng bước BTV đang giữ hồ sơ.
 * Lưu (không thêm bảng / cột):
 *   - submissions.title / summary / content: nội dung mới (JPA tự ghi khi hết transaction)
 *   - editorial_reviews: 1 dòng review_role EDITOR, action REQUEST_EDIT, status ACCEPTED (= đã áp dụng),
 *     content_snapshot = JSON { original, edited } để xem lại bản gốc; comments = các ô đã sửa
 *   - submission_events: 1 bước "Biên tập viên đã biên tập lại nội dung hồ sơ." (người gửi biết nội dung đã được biên tập)
 */
@Service
@RequiredArgsConstructor
public class SubmissionEditService {

    public static final String EDIT_NOTE_PREFIX = "Đã sửa trực tiếp: ";

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final LeadershipRepository reviewRepository;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;
    private final ObjectMapper objectMapper;

    /** 3 ô sửa được, cùng giới hạn với lúc người dân gửi hồ sơ (CreateSubmissionRequest). */
    public record ContentBody(
            @NotBlank(message = "Vui lòng nhập tiêu đề.")
            @Size(min = 10, max = 200, message = "Tiêu đề dài từ 10 đến 200 ký tự.")
            String title,
            @NotBlank(message = "Vui lòng nhập tóm tắt sự việc.")
            @Size(max = 300, message = "Tóm tắt tối đa 300 ký tự.")
            String summary,
            @NotBlank(message = "Vui lòng nhập nội dung.")
            @Size(min = 50, max = 5000, message = "Nội dung dài từ 50 đến 5000 ký tự.")
            String content) {
    }

    /** JSON trong content_snapshot của dòng sửa trực tiếp. */
    public record EditSnapshot(ContentBody original, ContentBody edited) {
    }

    @Transactional
    public SubmissionDetail edit(String editorId, String trackingCode, ContentBody body) {
        User editor = userRepository.getActiveById(editorId);
        Submission submission = submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .filter(found -> found.getType() != Submission.SubmissionType.CONTRIBUTOR_POST)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
        if (submission.getStatus() != SubmissionStatus.IN_REVIEW) {
            throw AppException.conflict("Chỉ sửa được hồ sơ đang thẩm định.");
        }

        ContentBody original = new ContentBody(submission.getTitle(), submission.getSummary(), submission.getContent());
        ContentBody edited = new ContentBody(body.title().trim(), body.summary().trim(), body.content().trim());
        List<String> changed = new ArrayList<>();
        if (!edited.title().equals(original.title())) changed.add("tiêu đề");
        if (!edited.summary().equals(original.summary())) changed.add("tóm tắt");
        if (!edited.content().equals(original.content())) changed.add("nội dung");
        if (changed.isEmpty()) {
            throw AppException.badRequest("Bạn chưa thay đổi gì so với nội dung hiện tại.");
        }

        submission.setTitle(edited.title());
        submission.setSummary(edited.summary());
        submission.setContent(edited.content());
        reviewRepository.save(EditoralReview.builder()
                .submission(submission)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(EditoralReview.ReviewAction.REQUEST_EDIT)
                .status(EditoralReview.RequestStatus.ACCEPTED)
                .comments(EDIT_NOTE_PREFIX + String.join(", ", changed) + ".")
                .contentSnapshot(objectMapper.writeValueAsString(new EditSnapshot(original, edited)))
                .build());
        eventService.record(submission, SubmissionStatus.IN_REVIEW, SubmissionEvent.Actor.EDITOR,
                "Biên tập viên đã biên tập lại nội dung hồ sơ.", null);
        return trackingService.getForStaff(submission.getTrackingCode());
    }
}
