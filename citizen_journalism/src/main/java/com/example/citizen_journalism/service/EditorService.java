package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.editor.EditorOverview;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.SubmissionSummary;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BÀN LÀM VIỆC CỦA BIÊN TẬP VIÊN (EditorController, frontend /editor/...).
 *
 * Hiện có: số liệu trang Tổng quan, HÀNG ĐỢI TIN BÀI (xem danh sách + chi tiết, CHƯA có thao tác xử lý).
 * Các thao tác xử lý tin (tiếp nhận, yêu cầu bổ sung, giao CTV xác minh...) sẽ thêm ở các bản sau;
 * khi đổi trạng thái hồ sơ nhớ dùng SubmissionEventService.record để người gửi theo dõi được.
 * Phần đơn đăng ký CTV nằm ở ContributorApplicationService.
 */
@Service
@RequiredArgsConstructor
public class EditorService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionTrackingService trackingService;
    private final ContributorApplicationService applicationService;

    @Transactional(readOnly = true)
    public EditorOverview getOverview() {
        PageRequest latest = PageRequest.of(0, 5, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return new EditorOverview(
                submissionRepository.countByTypeAndStatus(Submission.SubmissionType.HOT_NEWS, SubmissionStatus.PENDING),
                submissionRepository.countByTypeAndStatus(Submission.SubmissionType.COMPLAINT, SubmissionStatus.PENDING),
                submissionRepository.countByStatus(SubmissionStatus.IN_REVIEW),
                submissionRepository.countByStatus(SubmissionStatus.NEED_MORE_INFO),
                applicationService.countPendingForEditor(),
                submissionRepository.searchForStaff(SubmissionStatus.PENDING, null, latest).map(SubmissionSummary::from).getContent(),
                applicationService.latestPending(5));
    }

    /**
     * Hàng đợi tin bài. Chờ tiếp nhận (PENDING): cũ nhất trước, để tin gửi trước được xử lý trước;
     * các trường hợp khác: mới nhất trước. status / category = null nghĩa là không lọc.
     */
    @Transactional(readOnly = true)
    public PageResponse<SubmissionSummary> listSubmissions(SubmissionStatus status, Submission.ReportCategory category,
                                                           int page, int size) {
        Sort sort = status == SubmissionStatus.PENDING
                ? Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))
                : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), sort);
        return PageResponse.from(submissionRepository.searchForStaff(status, category, pageable).map(SubmissionSummary::from));
    }

    public SubmissionDetail getSubmission(String trackingCode) {
        return trackingService.getForStaff(trackingCode);
    }
}
