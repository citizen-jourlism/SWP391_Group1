
package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.deputy.DeputyReviewApplicationRequest;
import com.example.citizen_journalism.dto.editor.ApplicationListItem;
import com.example.citizen_journalism.dto.editor.EditorApplicationDetail;
import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ContributorApplicationRepository;
import com.example.citizen_journalism.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TungTT - Phó Tổng Biên tập xét duyệt đơn đăng ký Cộng tác viên.
 *
 * Quy trình:
 * PENDING_EDITOR -> PENDING_DEPUTY -> APPROVED / REJECTED
 *
 * APPROVED: Người dân trở thành CONTRIBUTOR ngay.
 * REJECTED: Gửi phản hồi để người dân bổ sung và nộp lại.
 */
@Service
@RequiredArgsConstructor
public class DeputyContributorApplicationService {

    private final ContributorApplicationRepository applicationRepository;
    private final ContributorApplicationService applicationService;
    private final UserRepository userRepository;
    private final MailService mailService;

    /**
     * Kiểm tra người thao tác có đúng vai trò Phó Tổng Biên tập.
     * Không sử dụng role do Frontend tự gửi lên.
     */
    private User requireDeputy(String userId) {
        User user = userRepository.getActiveById(userId);

        if (user.getRole() != User.Role.DEPUTY_EIC) {
            throw AppException.forbidden(
                    "Chỉ Phó Tổng Biên tập được xét duyệt đơn này.",
                    "DEPUTY_ROLE_REQUIRED"
            );
        }

        return user;
    }

    /**
     * Danh sách đơn chờ Phó Tổng Biên tập duyệt.
     */
    @Transactional(readOnly = true)
    public PageResponse<ApplicationListItem> list(
            String deputyId,
            int page,
            int size
    ) {
        requireDeputy(deputyId);

        return applicationService.listForEditor(
                ContributorApplication.Status.PENDING_DEPUTY,
                page,
                size
        );
    }

    /**
     * Chỉ cho xem đơn đang chờ duyệt hoặc đơn từng được
     * chính Phó Tổng Biên tập này xử lý.
     */
    private ContributorApplication findAccessible(
            String deputyId,
            Long applicationId
    ) {
        ContributorApplication application = applicationRepository
                .findWithApplicantById(applicationId)
                .orElseThrow(() ->
                        AppException.notFound("Không tìm thấy đơn đăng ký.")
                );

        boolean pending = application.getStatus()
                == ContributorApplication.Status.PENDING_DEPUTY;

        boolean reviewedByDeputy = application.getDeputy() != null
                && deputyId.equals(application.getDeputy().getId());

        if (!pending && !reviewedByDeputy) {
            throw AppException.notFound("Không tìm thấy đơn đăng ký.");
        }

        return application;
    }

    /**
     * Xem chi tiết đơn.
     */
    @Transactional(readOnly = true)
    public EditorApplicationDetail get(
            String deputyId,
            Long applicationId
    ) {
        requireDeputy(deputyId);
        findAccessible(deputyId, applicationId);

        return applicationService.getForEditor(applicationId);
    }

    /**
     * Xem giấy tờ của người đăng ký sau khi kiểm tra quyền.
     */
    @Transactional(readOnly = true)
    public ContributorApplicationService.DocumentFile openDocument(
            String deputyId,
            Long applicationId,
            int index
    ) {
        requireDeputy(deputyId);
        findAccessible(deputyId, applicationId);

        return applicationService.openDocumentForStaff(
                applicationId,
                index
        );
    }

    /**
     * Xử lý quyết định cuối cùng của Phó Tổng Biên tập.
     *
     * @Transactional đảm bảo việc cập nhật đơn và người dân
     * nằm trong cùng một giao dịch Database.
     */
    @Transactional
    public EditorApplicationDetail review(
            String deputyId,
            Long applicationId,
            DeputyReviewApplicationRequest request
    ) {
        User deputy = requireDeputy(deputyId);

        ContributorApplication application = applicationRepository
                .findWithApplicantById(applicationId)
                .orElseThrow(() ->
                        AppException.notFound("Không tìm thấy đơn đăng ký.")
                );

        // Không được xử lý lại đơn đã có quyết định cuối.
        if (application.getStatus()
                != ContributorApplication.Status.PENDING_DEPUTY) {
            throw AppException.conflict(
                    "Đơn không còn ở trạng thái chờ Phó Tổng Biên tập."
            );
        }

        // Đảm bảo đã qua bước xét duyệt của Biên tập viên.
        if (application.getEditor() == null
                || application.getEditorReviewedAt() == null) {
            throw AppException.conflict(
                    "Đơn chưa hoàn tất bước xét duyệt của Biên tập viên."
            );
        }

        User applicant = application.getApplicant();

        // Chỉ tài khoản người dân được xét nâng cấp.
        if (applicant.getRole() != User.Role.CITIZEN) {
            throw AppException.conflict(
                    "Tài khoản này không còn là người dân."
            );
        }

        boolean rejected = request.decision()
                == DeputyReviewApplicationRequest.Decision.REJECT;

        String note;

        if (rejected) {
            // REJECT: Bắt buộc cả ba nội dung phản hồi.
            note = buildRejectNote(
                    request.rejectionReason(),
                    request.missingInformation(),
                    request.improvementRequest()
            );
        } else {
            // APPROVE: Ghi chú thông thường có thể để trống.
            note = request.note() == null
                    ? null
                    : request.note().trim();

            if (note != null && note.isEmpty()) {
                note = null;
            }
        }

        // Ghi nhận người xử lý và thời gian duyệt.
        application.setDeputy(deputy);
        application.setDeputyNote(note);
        application.setDeputyReviewedAt(LocalDateTime.now());

        if (rejected) {
            // Đơn bị từ chối, người đăng ký vẫn là CITIZEN.
            application.setStatus(
                    ContributorApplication.Status.REJECTED
            );

            applicant.setUpgradeStatus(
                    User.UpgradeStatus.REJECTED
            );
        } else {
            // Chấp thuận đơn.
            application.setStatus(
                    ContributorApplication.Status.APPROVED
            );

            applicant.setUpgradeStatus(
                    User.UpgradeStatus.APPROVED
            );

            // TungTT: Tự động nâng cấp vai trò ngay sau khi duyệt.
            applicant.setRole(User.Role.CONTRIBUTOR);
        }

        EditorApplicationDetail result =
                applicationService.getForEditor(applicationId);

        // Gửi email thông báo. Không ghi mật khẩu hay dữ liệu giấy tờ.
        notifyApplicant(application, rejected);

        return result;
    }

    /**
     * Chuẩn hóa từng nội dung và kiểm tra độ dài.
     */
    private String requireFeedback(
            String value,
            String field,
            String label
    ) {
        String cleaned = value == null ? "" : value.trim();

        if (cleaned.isEmpty()) {
            throw AppException.invalidFields(
                    Map.of(field, "Vui lòng nhập " + label + ".")
            );
        }

        if (cleaned.length() > 200) {
            throw AppException.invalidFields(
                    Map.of(field, label + " tối đa 200 ký tự.")
            );
        }

        return cleaned;
    }

    /**
     * Ghép ba thông tin từ chối vào deputyNote hiện có.
     * Không cần bổ sung cột Database.
     */
    private String buildRejectNote(
            String rejectionReason,
            String missingInformation,
            String improvementRequest
    ) {
        String reason = requireFeedback(
                rejectionReason,
                "rejectionReason",
                "lý do từ chối"
        );

        String missing = requireFeedback(
                missingInformation,
                "missingInformation",
                "thông tin cần bổ sung"
        );

        String improvement = requireFeedback(
                improvementRequest,
                "improvementRequest",
                "yêu cầu cải thiện"
        );

        return "Lý do từ chối:\n" + reason
                + "\n\nThông tin còn thiếu:\n" + missing
                + "\n\nYêu cầu bổ sung / cải thiện:\n" + improvement;
    }

    /**
     * Gửi kết quả cuối đến email của người đăng ký.
     * Nếu email chưa được cấu hình gửi thật, MailService
     * có thể ghi thông báo vào log phát triển.
     */
    private void notifyApplicant(
            ContributorApplication application,
            boolean rejected
    ) {
        User applicant = application.getApplicant();

        String result = rejected
                ? "Đơn đăng ký Cộng tác viên của bạn chưa được chấp thuận."
                : "Đơn đăng ký đã được phê duyệt. "
                    + "Tài khoản của bạn đã trở thành Cộng tác viên.";

        String feedback = application.getDeputyNote() == null
                ? ""
                : MailService.box(
                        MailService.escape(
                                application.getDeputyNote()
                        ).replace("\n", "<br>")
                );

        String instruction = rejected
                ? "Vui lòng xem phản hồi, bổ sung hồ sơ và "
                    + "nộp lại đơn đăng ký khi đã hoàn thiện."
                : "Vui lòng đăng nhập lại để cập nhật quyền Cộng tác viên.";

        String html = MailService.layout("""
                <p>Xin chào <b>%s</b>,</p>
                <p>%s</p>
                %s
                <p>%s</p>
                <p>Xem chi tiết tại mục Hồ sơ của tôi → Cộng tác viên.</p>
                """.formatted(
                    MailService.escape(applicant.getFullName()),
                    result,
                    feedback,
                    instruction
                ));

        mailService.trySend(
                applicant.getEmail(),
                "[Tin Nóng Dân Sinh] Kết quả xét duyệt Cộng tác viên",
                html
        );
    }
}
