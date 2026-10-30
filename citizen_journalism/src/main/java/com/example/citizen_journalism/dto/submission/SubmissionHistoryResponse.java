package com.example.citizen_journalism.dto.submission;

import com.example.citizen_journalism.entity.Submission.ReportCategory;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;

/**
 * LỊCH SỬ CHỈNH SỬA một hồ sơ của tôi: GET /api/submissions/mine/{code}/history
 * (SubmissionHistoryController -> SubmissionHistoryService). Frontend: routes/SubmissionHistory.jsx.
 *
 * Không có bảng lưu phiên bản riêng: backend dựng danh sách phiên bản từ dữ liệu có sẵn
 * (submissions + submission_events + evidences), xem SubmissionHistoryService.
 * Việc so sánh 2 phiên bản (đếm từ, tô màu phần thêm mới) làm ở frontend (lib/revisionHistory.js).
 *
 * @param revisions các phiên bản theo thứ tự thời gian: phần tử đầu là bản gốc (number = 1)
 */
public record SubmissionHistoryResponse(
        String trackingCode,
        ReportCategory category,
        String title,
        SubmissionStatus status,
        LocalDateTime createdAt,
        List<RevisionResponse> revisions) {

    /**
     * Một phiên bản. Bản gốc (number 1): content = nội dung chi tiết lúc gửi, không có lời đề nghị.
     * Bản bổ sung (number >= 2): chỉ chứa phần THÊM MỚI của lần bổ sung đó.
     *
     * @param number          số phiên bản (1 = bản gốc)
     * @param createdAt       thời điểm gửi bản này
     * @param content         nội dung chữ: bản gốc = nội dung chi tiết; bản bổ sung = thông tin bổ sung (một ô chung).
     *                        Chuyên gia trả lời từng mục thì content = null, xem answers
     * @param answers         câu trả lời từng mục (Chuyên gia), mỗi câu kèm câu hỏi của Biên tập viên
     * @param address         địa điểm (địa chỉ cụ thể) TẠI phiên bản này
     * @param previousAddress địa chỉ trước khi sửa, chỉ có khi lần bổ sung này đổi địa chỉ
     * @param sources         nguồn tham khảo thêm ở lần bổ sung này
     * @param evidences       tệp tư liệu thêm ở phiên bản này (bản gốc: các tệp lúc gửi)
     * @param requestMessage  lời nhắn đề nghị bổ sung của Biên tập viên dẫn tới phiên bản này (bỏ các mục đánh số)
     * @param requestItems    các mục đánh số trong lời đề nghị đó ("1. ...", "2. ...")
     * @param requestedAt     thời điểm Biên tập viên đề nghị
     */
    public record RevisionResponse(
            int number,
            LocalDateTime createdAt,
            String content,
            List<AnswerResponse> answers,
            String address,
            String previousAddress,
            List<SourceResponse> sources,
            List<EvidenceInfo> evidences,
            String requestMessage,
            List<String> requestItems,
            LocalDateTime requestedAt) {
    }

    /** Một câu trả lời của Chuyên gia. question = mục tương ứng trong lời đề nghị (null nếu không tìm thấy). */
    public record AnswerResponse(int item, String question, String answer) {
    }

    /** Một nguồn tham khảo bổ sung. url có thể null (sách in, văn bản giấy...). */
    public record SourceResponse(String title, String url) {
    }
}
