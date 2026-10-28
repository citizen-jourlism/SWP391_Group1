package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.normalizeEmail;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.violation.AppealStatusRequest;
import com.example.citizen_journalism.dto.violation.CreateAppealRequest;
import com.example.citizen_journalism.dto.violation.DecideAppealRequest;
import com.example.citizen_journalism.dto.violation.ReviewAppealRequest;
import com.example.citizen_journalism.dto.violation.ViolationAppealView;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.ViolationAppeal;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.repository.ViolationAppealRepository;
import com.example.citizen_journalism.util.Paging;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ViolationAppealService {

    private static final List<ViolationAppeal.Status> OPEN_STATUSES =
            List.of(ViolationAppeal.Status.PENDING_EDITOR, ViolationAppeal.Status.PENDING_FINAL);

    private final ViolationAppealRepository appealRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Transactional
    public ViolationAppealView create(CreateAppealRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .filter(account -> passwordEncoder.matches(request.password(), account.getPasswordHash()))
                .filter(account -> account.getStatus() == User.Status.LOCKED)
                .orElseThrow(() -> AppException.badRequest("Không thể gửi khiếu nại. Hãy kiểm tra thông tin đăng nhập và trạng thái tài khoản."));
        if (appealRepository.existsByUserIdAndStatusIn(user.getId(), OPEN_STATUSES)) {
            throw AppException.conflict("Tài khoản đang có khiếu nại chờ xử lý.");
        }
        ViolationAppeal appeal = appealRepository.save(ViolationAppeal.builder()
                .user(user)
                .reason(request.reason().trim())
                .evidenceNote(request.evidenceNote() == null || request.evidenceNote().isBlank()
                        ? null : request.evidenceNote().trim())
                .status(ViolationAppeal.Status.PENDING_EDITOR)
                .build());
        notifyUser(appeal, "Đã nhận khiếu nại mở khóa",
                "Hồ sơ #" + appeal.getId() + " đang chờ Biên tập viên xem xét.");
        return ViolationAppealView.from(appeal);
    }

    @Transactional(readOnly = true)
    public ViolationAppealView getOwn(AppealStatusRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .filter(account -> passwordEncoder.matches(request.password(), account.getPasswordHash()))
                .orElseThrow(() -> AppException.badRequest("Thông tin xác thực không chính xác."));
        ViolationAppeal appeal = find(request.appealId());
        if (!appeal.getUser().getId().equals(user.getId())) {
            throw AppException.notFound("Không tìm thấy khiếu nại.");
        }
        return ViolationAppealView.from(appeal);
    }

    @Transactional(readOnly = true)
    public PageResponse<ViolationAppealView> list(ViolationAppeal.Status status, String keyword, int page, int size) {
        return PageResponse.from(appealRepository.search(status, blankToNull(keyword),
                Paging.of(page, size, Paging.NEWEST_FIRST)).map(ViolationAppealView::from));
    }

    @Transactional(readOnly = true)
    public ViolationAppealView get(Long id) {
        return ViolationAppealView.from(find(id));
    }

    @Transactional
    public ViolationAppealView review(String editorId, Long id, ReviewAppealRequest request) {
        ViolationAppeal appeal = find(id);
        if (appeal.getStatus() != ViolationAppeal.Status.PENDING_EDITOR) {
            throw AppException.conflict("Khiếu nại này đã được biên tập viên xem xét.");
        }
        User editor = userRepository.getActiveById(editorId);
        String note = blankToNull(request.note());
        if (request.decision() == ReviewAppealRequest.Decision.REJECT && (note == null || note.length() < 10)) {
            throw AppException.invalidFields(java.util.Map.of("note", "Vui lòng ghi lý do từ chối, ít nhất 10 ký tự."));
        }
        appeal.setReviewedBy(editor);
        appeal.setReviewNote(note);
        appeal.setReviewedAt(LocalDateTime.now());
        appeal.setStatus(request.decision() == ReviewAppealRequest.Decision.FORWARD
                ? ViolationAppeal.Status.PENDING_FINAL : ViolationAppeal.Status.REJECTED);
        notifyUser(appeal, "Cập nhật khiếu nại mở khóa",
                request.decision() == ReviewAppealRequest.Decision.FORWARD
                        ? "Hồ sơ đã được chuyển đến lãnh đạo tòa soạn để quyết định."
                        : "Hồ sơ đã bị từ chối ở bước sơ duyệt. Ghi chú: " + (note == null ? "Không có" : note));
        return ViolationAppealView.from(appeal);
    }

    @Transactional
    public ViolationAppealView decide(String leaderId, Long id, DecideAppealRequest request) {
        ViolationAppeal appeal = find(id);
        if (appeal.getStatus() != ViolationAppeal.Status.PENDING_FINAL) {
            throw AppException.conflict("Khiếu nại này chưa được chuyển đến bước phê duyệt cuối.");
        }
        User leader = userRepository.getActiveById(leaderId);
        String note = blankToNull(request.note());
        if (request.decision() == DecideAppealRequest.Decision.REJECT && (note == null || note.length() < 10)) {
            throw AppException.invalidFields(java.util.Map.of("note", "Vui lòng ghi lý do từ chối, ít nhất 10 ký tự."));
        }
        appeal.setDecidedBy(leader);
        appeal.setDecisionNote(note);
        appeal.setDecidedAt(LocalDateTime.now());
        if (request.decision() == DecideAppealRequest.Decision.APPROVE) {
            User user = appeal.getUser();
            if (user.getStatus() != User.Status.LOCKED) {
                throw AppException.conflict("Tài khoản không còn ở trạng thái bị khóa.");
            }
            user.setStatus(User.Status.ACTIVE);
            user.setIsVerified(true);
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            appeal.setStatus(ViolationAppeal.Status.APPROVED);
        } else {
            appeal.setStatus(ViolationAppeal.Status.REJECTED);
        }
        notifyUser(appeal, "Quyết định khiếu nại mở khóa",
                request.decision() == DecideAppealRequest.Decision.APPROVE
                        ? "Khiếu nại được chấp thuận và tài khoản đã được mở khóa."
                        : "Khiếu nại đã bị từ chối. Ghi chú: " + (note == null ? "Không có" : note));
        return ViolationAppealView.from(appeal);
    }

    private ViolationAppeal find(Long id) {
        return appealRepository.findWithDetailsById(id)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy khiếu nại mở khóa."));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void notifyUser(ViolationAppeal appeal, String subject, String message) {
        mailService.trySend(appeal.getUser().getEmail(), "[Tin Nóng Dân Sinh] " + subject,
                MailService.layout("<p>Xin chào <b>" + MailService.escape(appeal.getUser().getFullName()) + "</b>,</p>"
                        + "<p>" + MailService.escape(message) + "</p>"));
    }
}
