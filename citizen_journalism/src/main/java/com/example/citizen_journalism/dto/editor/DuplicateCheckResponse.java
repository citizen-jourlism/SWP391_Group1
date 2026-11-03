package com.example.citizen_journalism.dto.editor;

import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.dto.submission.SubmissionDetail;
import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Dữ liệu màn KIỂM TRA TIN TRÙNG: GET /api/editor/submissions/{mã}/duplicates (và kết quả của confirm / dismiss).
 * Frontend: routes/editor/EditorDuplicateCheck.jsx. Xem DuplicateReviewService.
 *
 * @param submission hồ sơ đang xét (như GET /api/editor/submissions/{mã})
 * @param screening  trạng thái và số liệu của lần quét gần nhất
 * @param candidates hồ sơ tương tự ≥ ngưỡng, giống nhất trước; rỗng khi đang quét hoặc không có
 * @param review     kết luận Biên tập viên đã ghi nhận gần nhất; null khi chưa kết luận
 */
public record DuplicateCheckResponse(
        SubmissionDetail submission,
        Screening screening,
        List<Candidate> candidates,
        Review review) {

    /**
     * @param status           PROCESSING (đang quét, chưa có kết quả) | DONE
     * @param aiSummary        tóm tắt nội dung (cột submissions.ai_summary, nếu trống thì tóm tắt của lần quét)
     * @param threshold        % tương đồng tối thiểu để gợi ý
     * @param windowDays       chỉ so với hồ sơ gửi trong số ngày này
     * @param checkedAt        thời điểm có kết quả quét gần nhất; null khi chưa quét xong lần nào
     */
    public record Screening(String status, String aiSummary,
                            int threshold, int windowDays, LocalDateTime checkedAt) {
    }

    /**
     * Một hồ sơ tương tự. Tiêu đề, nội dung, trạng thái... đọc từ DB lúc trả về; % và tín hiệu lấy từ lần quét.
     *
     * @param similarity     % tương đồng 0–100
     * @param aiReason       nhận định ngắn vì sao giống
     * @param matchedPhrases cụm từ xuất hiện nguyên văn ở cả 2 hồ sơ (frontend tô vàng)
     */
    public record Candidate(String trackingCode, ReportCategory category, String title, String content, String address,
                            String province, SubmissionStatus status, LocalDateTime createdAt,
                            String assignedEditorName, List<EvidenceInfo> evidences, int similarity, String aiReason,
                            List<String> matchedPhrases, Signals signals) {
    }

    /**
     * Tín hiệu khớp. Hồ sơ không có toạ độ nên distanceMeters luôn null, thay bằng sameProvince.
     *
     * @param minutesApart chênh lệch thời điểm xảy ra (không có thì thời điểm gửi); null nếu không tính được
     */
    public record Signals(Integer distanceMeters, boolean sameProvince, Long minutesApart, int contentSimilarity) {
    }

    /**
     * @param decision DUPLICATE (trùng với hồ sơ original) | DISTINCT (không trùng)
     * @param original hồ sơ bị trùng khi DUPLICATE; null khi DISTINCT
     * @param note     ghi chú nội bộ của Biên tập viên
     */
    public record Review(String decision, Original original, String note, LocalDateTime reviewedAt) {
    }

    public record Original(String trackingCode, String title) {
    }
}
