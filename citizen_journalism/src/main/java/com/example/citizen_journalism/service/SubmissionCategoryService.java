package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.editor.ClassifySubmissionRequest;
import com.example.citizen_journalism.dto.editor.SubmissionCategoryResponse;
import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.CategoryManageRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PHÂN LOẠI TIN: Biên tập viên gán hồ sơ tin nóng / khiếu nại vào 1 chuyên mục (bảng categories), để khi duyệt
 * hồ sơ được chuyển đúng Phó Tổng biên tập phụ trách chuyên mục đó (categories.deputy_eic_id).
 * Luồng: components/editor/SubmissionCategoryPanel.jsx -> SubmissionCategoryController -> đây -> submissions.category_id.
 *
 * Chỉ phân loại khi hồ sơ còn ở bàn Biên tập viên; đổi chuyên mục bao nhiêu lần cũng được trước khi chuyển lên trên.
 * BẮT BUỘC trước khi chuyển Phó TBT: SubmissionApprovalService và SubmissionVerificationReviewService gọi routingProblem.
 * Chuyên mục và danh sách chuyên mục do màn Quản lý chuyên mục quản lý (CategoryManageService), ở đây chỉ đọc.
 */
@Service
@RequiredArgsConstructor
public class SubmissionCategoryService {

    /** Hồ sơ còn ở bàn Biên tập viên: được phân loại / đổi chuyên mục. */
    private static final Set<SubmissionStatus> EDITABLE_STATUSES = EnumSet.of(
            SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW, SubmissionStatus.NEED_MORE_INFO, SubmissionStatus.DEPUTY_REJECTED);

    private final SubmissionRepository submissionRepository;
    private final CategoryManageRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public SubmissionCategoryResponse get(String trackingCode) {
        return toResponse(findSubmission(trackingCode));
    }

    @Transactional
    public SubmissionCategoryResponse classify(String editorId, String trackingCode, ClassifySubmissionRequest request) {
        userRepository.getActiveById(editorId);
        Submission submission = findSubmission(trackingCode);
        if (!EDITABLE_STATUSES.contains(submission.getStatus())) {
            throw AppException.conflict("Hồ sơ đã chuyển khỏi bàn Biên tập viên, không đổi chuyên mục được nữa.");
        }
        Category category = categoryRepository.findById(request.categoryId())
                .filter(found -> Boolean.TRUE.equals(found.getIsActive()))
                .orElseThrow(() -> AppException.badRequest("Chuyên mục không tồn tại hoặc đã ngừng hoạt động. Vui lòng tải lại trang."));
        submission.setCategory(category); // JPA tự ghi xuống DB khi hết transaction
        return toResponse(submission);
    }

    /**
     * Lý do hồ sơ CHƯA chuyển Phó TBT được vì chuyên mục; null = đã phân loại và chuyên mục có người phụ trách.
     * Chuyên mục chưa có Phó TBT thì chặn luôn, nếu không hồ sơ sẽ nằm chờ mà không ai được giao duyệt.
     */
    public static String routingProblem(Submission submission) {
        Category category = submission.getCategory();
        if (category == null) {
            return "Hồ sơ chưa được phân loại chuyên mục. Hãy phân loại tin trước khi chuyển Phó Tổng biên tập.";
        }
        if (category.getDeputyEic() == null) {
            return "Chuyên mục \"" + category.getName() + "\" chưa có Phó Tổng biên tập phụ trách. "
                    + "Hãy chọn chuyên mục khác hoặc nhờ quản trị viên giao người phụ trách.";
        }
        return null;
    }

    // ================================ HÀM PHỤ ================================

    private Submission findSubmission(String trackingCode) {
        return submissionRepository.findByTrackingCode(trackingCode.trim().toUpperCase(Locale.ROOT))
                .filter(found -> found.getType() != Submission.SubmissionType.CONTRIBUTOR_POST)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
    }

    private SubmissionCategoryResponse toResponse(Submission submission) {
        Category current = submission.getCategory();
        var options = categoryRepository.findAll(Sort.by("name")).stream()
                .filter(category -> Boolean.TRUE.equals(category.getIsActive()))
                .map(category -> new SubmissionCategoryResponse.Option(category.getId(), category.getName(),
                        deputyName(category)))
                .toList();
        return new SubmissionCategoryResponse(
                current == null ? null : current.getId(),
                current == null ? null : current.getName(),
                current == null ? null : deputyName(current),
                EDITABLE_STATUSES.contains(submission.getStatus()),
                options);
    }

    private static String deputyName(Category category) {
        User deputy = category.getDeputyEic();
        return deputy == null ? null : deputy.getFullName();
    }
}
