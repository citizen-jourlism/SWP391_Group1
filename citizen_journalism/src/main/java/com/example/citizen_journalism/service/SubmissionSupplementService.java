package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.dto.submission.SupplementSubmissionRequest;
import com.example.citizen_journalism.dto.submission.SupplementSubmissionRequest.SourceRef;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.example.citizen_journalism.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * BỔ SUNG THÔNG TIN (Provide Additional Information) — người gửi (Người dân, Chuyên gia, Cộng tác viên) trả lời
 * khi Biên tập viên đề nghị bổ sung. API: SubmissionController (POST /api/submissions/mine/{mã}/supplement).
 * Frontend: routes/SupplementSubmission.jsx.
 *
 * ĐIỀU KIỆN: đúng chủ hồ sơ (người khác -> "Không tìm thấy hồ sơ") và hồ sơ đang NEED_MORE_INFO.
 *
 * GIỚI HẠN THÔNG TIN BỔ SUNG: Người dân / CTV 2000 ký tự, Chuyên gia 4000 (frontend: lib/submission.js SUPPLEMENT_LIMITS).
 * Chuyên gia trả lời từng mục (answers): tính TỔNG các câu trả lời; số câu trả lời phải bằng số mục trong lời nhắn
 * của Biên tập viên (ghi chú bước nhật ký gần nhất), cùng cách tách mục với frontend (splitRequestNote).
 *
 * KHÔNG cần thêm cột mới. Khi bổ sung, ghi:
 *   - Địa chỉ mới (nếu có và khác địa chỉ cũ) -> submissions.address
 *   - Tệp bổ sung -> evidences (cùng cách lưu với lúc gửi hồ sơ, SubmissionService.attachEvidences)
 *   - submissions.status = IN_REVIEW + 1 bước nhật ký (actor REPORTER):
 *       description "Người gửi đã bổ sung thông tin (kèm N tệp).", note = nội dung bổ sung + địa chỉ cũ/mới + nguồn tham khảo
 *     Biên tập viên đọc phần bổ sung ở bước nhật ký này.
 */
@Service
@RequiredArgsConstructor
public class SubmissionSupplementService {

    public static final int INFO_MAX = 2000;
    public static final int EXPERT_INFO_MAX = 4000;

    /** Dòng mở đầu một mục trong lời nhắn: "1. ...", "2) ..." */
    private static final Pattern REQUEST_ITEM = Pattern.compile("^\\d+[.)]\\s+.*");

    private final SubmissionRepository submissionRepository;
    private final SubmissionEventRepository eventRepository;
    private final UserRepository userRepository;
    private final SubmissionService submissionService;
    private final SubmissionEventService eventService;
    private final SubmissionTrackingService trackingService;

    /**
     * @return chi tiết hồ sơ SAU khi bổ sung (trạng thái mới + bước nhật ký mới), để frontend hiển thị ngay
     */
    @Transactional
    public SubmissionDetail supplement(String userId, String trackingCode, SupplementSubmissionRequest request,
                                       List<MultipartFile> files) {
        User author = userRepository.getActiveById(userId);
        String code = trackingCode.trim().toUpperCase(Locale.ROOT);
        Submission submission = submissionRepository.findByTrackingCodeAndAuthorId(code, userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
        if (submission.getStatus() != SubmissionStatus.NEED_MORE_INFO) {
            throw AppException.conflict("Hồ sơ hiện không cần bổ sung thông tin.");
        }

        // ----- 1. Chuẩn hoá + kiểm tra -----
        String info = blankToNull(request.additionalInfo());
        List<String> answers = request.answers() == null ? List.of() : request.answers();
        int infoMax = author.getRole() == User.Role.EXPERT ? EXPERT_INFO_MAX : INFO_MAX;
        String address = blankToNull(request.address());
        String oldAddress = submission.getAddress();
        if (address != null && address.equals(oldAddress)) {
            address = null; // Gửi lại đúng địa chỉ cũ -> coi như không đổi
        }
        List<SourceRef> sources = request.sources() == null ? List.of() : request.sources();
        List<MultipartFile> evidenceFiles = files == null ? List.of() : files;

        Map<String, String> errors = new LinkedHashMap<>();
        if (!answers.isEmpty()) {
            info = joinAnswers(submission, answers, info, infoMax, errors);
        } else if (info != null && info.length() > infoMax) {
            errors.put("additionalInfo", "Thông tin bổ sung tối đa " + infoMax + " ký tự.");
        }
        if (info == null && address == null && sources.isEmpty() && evidenceFiles.isEmpty() && errors.isEmpty()) {
            errors.put("additionalInfo", "Vui lòng nhập nội dung bổ sung hoặc đính kèm ít nhất 1 tệp.");
        }
        submissionService.validateEvidenceFiles(evidenceFiles, errors);
        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }

        // ----- 2. Lưu -----
        if (address != null) {
            submission.setAddress(address);
        }
        submissionService.attachEvidences(submission, author, submission.getTrackingCode(), evidenceFiles);

        String description = evidenceFiles.isEmpty()
                ? "Người gửi đã bổ sung thông tin."
                : "Người gửi đã bổ sung thông tin (kèm " + evidenceFiles.size() + " tệp).";
        eventService.record(submission, SubmissionStatus.IN_REVIEW, SubmissionEvent.Actor.REPORTER, description,
                buildNote(info, oldAddress, address, sources));

        return trackingService.getMine(userId, code);
    }

    /**
     * Kiểm tra câu trả lời từng mục rồi ghép thành "Mục 1: ...\n\nMục 2: ...". Lỗi ghi vào errors với khoá
     * answer0, answer1... (trùng tên ô ở frontend) hoặc "answers" (sai số mục / vượt tổng số ký tự).
     */
    private String joinAnswers(Submission submission, List<String> answers, String info, int infoMax,
                               Map<String, String> errors) {
        if (info != null) {
            errors.put("additionalInfo", "Đã trả lời theo từng mục thì không gửi thêm ô thông tin chung.");
            return info;
        }
        int itemCount = countRequestItems(submission);
        if (answers.size() != itemCount) {
            errors.put("answers", "Số câu trả lời không khớp với số mục toà soạn yêu cầu (" + itemCount + " mục).");
            return null;
        }
        List<String> parts = new ArrayList<>();
        int total = 0;
        for (int i = 0; i < answers.size(); i++) {
            String answer = blankToNull(answers.get(i));
            if (answer == null) {
                errors.put("answer" + i, "Vui lòng trả lời mục này.");
            } else {
                total += answer.length();
                parts.add("Mục " + (i + 1) + ": " + answer);
            }
        }
        if (total > infoMax) {
            errors.put("answers", "Tổng các câu trả lời tối đa " + infoMax + " ký tự (hiện " + total + ").");
        }
        return parts.isEmpty() ? null : String.join("\n\n", parts);
    }

    /** Số mục đánh số trong lời nhắn đề nghị bổ sung gần nhất. */
    private int countRequestItems(Submission submission) {
        SubmissionEvent request = SubmissionEventService.latestInfoRequest(eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission));
        String note = request == null ? null : request.getNote();
        if (note == null) {
            return 0;
        }
        return (int) note.lines().map(String::trim).filter(line -> REQUEST_ITEM.matcher(line).matches()).count();
    }

    /** Nội dung bước nhật ký: thông tin bổ sung, địa chỉ cập nhật, nguồn tham khảo. Không có gì -> null. */
    private static String buildNote(String info, String oldAddress, String newAddress, List<SourceRef> sources) {
        List<String> parts = new ArrayList<>();
        if (info != null) {
            parts.add(info);
        }
        if (newAddress != null) {
            parts.add("Cập nhật địa chỉ: " + newAddress + " (trước đây: " + oldAddress + ")");
        }
        if (!sources.isEmpty()) {
            StringBuilder text = new StringBuilder("Nguồn tham khảo bổ sung:");
            for (SourceRef source : sources) {
                text.append("\n- ").append(source.title().trim());
                String url = blankToNull(source.url());
                if (url != null) {
                    text.append(" (").append(url).append(')');
                }
            }
            parts.add(text.toString());
        }
        return parts.isEmpty() ? null : String.join("\n\n", parts);
    }
}
