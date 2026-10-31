package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.submission.EvidenceInfo;
import com.example.citizen_journalism.dto.submission.SubmissionHistoryResponse;
import com.example.citizen_journalism.dto.submission.SubmissionHistoryResponse.AnswerResponse;
import com.example.citizen_journalism.dto.submission.SubmissionHistoryResponse.RevisionResponse;
import com.example.citizen_journalism.dto.submission.SubmissionHistoryResponse.SourceResponse;
import com.example.citizen_journalism.entity.Evidence;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.EvidenceRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * LỊCH SỬ CHỈNH SỬA (Audit Revision History) — người gửi (Người dân, Chuyên gia, Cộng tác viên) xem lại hồ sơ
 * của mình qua từng lần bổ sung. API: SubmissionHistoryController (GET /api/submissions/mine/{mã}/history).
 * Frontend: routes/SubmissionHistory.jsx (mở từ nút "Lịch sử chỉnh sửa" ở trang Theo dõi hồ sơ).
 *
 * ĐIỀU KIỆN: đã đăng nhập và đúng chủ hồ sơ (người khác -> "Không tìm thấy hồ sơ"). Chỉ xem, không sửa gì.
 *
 * KHÔNG có bảng lưu phiên bản. Các phiên bản được DỰNG LẠI từ dữ liệu có sẵn:
 *   - Phiên bản 1 (bản gốc) = submissions.content + các tệp người gửi tải lên trước lần đề nghị bổ sung đầu tiên.
 *   - Phiên bản 2..N = mỗi bước nhật ký người gửi bổ sung thông tin (actor REPORTER, status IN_REVIEW,
 *     do SubmissionSupplementService ghi). note của bước này gồm các khối cách nhau 1 dòng trống:
 *       "<thông tin bổ sung hoặc Mục 1: ...\n\nMục 2: ...>"
 *       "Cập nhật địa chỉ: <mới> (trước đây: <cũ>)"
 *       "Nguồn tham khảo bổ sung:\n- <tên> (<đường dẫn>)"
 *   - Lời đề nghị dẫn tới phiên bản = note của bước NEED_MORE_INFO (Biên tập viên) ngay trước lần bổ sung.
 *   - Tệp của 1 lần bổ sung = tệp người gửi tải lên SAU lời đề nghị đó (tệp bổ sung được lưu trước bước nhật ký).
 * Cách ghi note ở SubmissionSupplementService đổi thì phải sửa phần tách note ở đây cho khớp.
 */
@Service
@RequiredArgsConstructor
public class SubmissionHistoryService {

    /** Dòng mở đầu một mục trong lời đề nghị: "1. ...", "2) ..." (giống SubmissionSupplementService). */
    private static final Pattern REQUEST_ITEM = Pattern.compile("^(\\d+)[.)]\\s+(.*)$");
    /** Đầu một câu trả lời của Chuyên gia: "Mục 2: ..." ở đầu dòng. */
    private static final Pattern ANSWER_HEAD = Pattern.compile("(?m)^Mục (\\d+): ");
    /** Khối đổi địa chỉ. (?s): địa chỉ có xuống dòng vẫn khớp. */
    private static final Pattern ADDRESS_BLOCK = Pattern.compile("(?s)^Cập nhật địa chỉ: (.*) \\(trước đây: (.*)\\)$");
    private static final String SOURCES_HEAD = "Nguồn tham khảo bổ sung:";
    /** Một dòng nguồn: "- Tên nguồn (đường dẫn)"; phần (đường dẫn) không bắt buộc. */
    private static final Pattern SOURCE_LINE = Pattern.compile("^- (.*?)(?: \\(([^()]*)\\))?$");

    private final SubmissionRepository submissionRepository;
    private final SubmissionEventRepository eventRepository;
    private final EvidenceRepository evidenceRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SubmissionHistoryResponse getMine(String userId, String trackingCode) {
        Submission submission = submissionRepository
                .findByTrackingCodeAndAuthorId(trackingCode.trim().toUpperCase(Locale.ROOT), userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy hồ sơ."));
        List<SubmissionEvent> events = eventRepository.findBySubmissionOrderByCreatedAtAscIdAsc(submission);

        // ----- 1. Các lần bổ sung + lời đề nghị ngay trước mỗi lần -----
        List<Supplement> supplements = new ArrayList<>();
        SubmissionEvent lastRequest = null;
        for (SubmissionEvent event : events) {
            if (event.getStatus() == SubmissionStatus.NEED_MORE_INFO && event.getActor() == SubmissionEvent.Actor.EDITOR) {
                lastRequest = event;
            } else if (event.getActor() == SubmissionEvent.Actor.REPORTER && event.getStatus() == SubmissionStatus.IN_REVIEW) {
                supplements.add(new Supplement(event, lastRequest));
                lastRequest = null; // Mỗi lời đề nghị chỉ gắn với 1 lần bổ sung
            }
        }

        // ----- 2. Chia tệp của người gửi vào từng phiên bản (0 = bản gốc, i = lần bổ sung thứ i) -----
        List<List<EvidenceInfo>> evidencesByVersion = new ArrayList<>();
        for (int i = 0; i <= supplements.size(); i++) {
            evidencesByVersion.add(new ArrayList<>());
        }
        String authorId = submission.getAuthor().getId();
        for (Evidence evidence : evidenceRepository.findBySubmissionOrderByIdAsc(submission)) {
            if (evidence.getUploadedBy() != null && !authorId.equals(evidence.getUploadedBy().getId())) {
                continue; // Tệp do toà soạn tải lên không thuộc phiên bản nào của người gửi
            }
            evidencesByVersion.get(versionOf(evidence.getCreatedAt(), supplements))
                    .add(EvidenceInfo.from(evidence, objectMapper));
        }

        // ----- 3. Tách note của từng lần bổ sung -----
        List<ParsedNote> notes = supplements.stream().map(supplement -> parseNote(supplement.event().getNote())).toList();

        // Địa chỉ của bản gốc: lần đổi địa chỉ ĐẦU TIÊN ghi lại địa chỉ cũ; chưa đổi lần nào thì là địa chỉ hiện tại
        String address = notes.stream().filter(note -> note.previousAddress() != null).findFirst()
                .map(ParsedNote::previousAddress).orElse(submission.getAddress());

        // ----- 4. Ghép kết quả -----
        List<RevisionResponse> revisions = new ArrayList<>();
        revisions.add(new RevisionResponse(1, submission.getCreatedAt(), submission.getContent(), List.of(), address,
                null, List.of(), evidencesByVersion.get(0), null, List.of(), null));
        for (int i = 0; i < supplements.size(); i++) {
            Supplement supplement = supplements.get(i);
            ParsedNote note = notes.get(i);
            RequestNote request = parseRequest(supplement.request() == null ? null : supplement.request().getNote());
            if (note.newAddress() != null) {
                address = note.newAddress();
            }
            List<AnswerResponse> answers = note.answers().stream()
                    .map(answer -> new AnswerResponse(answer.item(),
                            answer.item() <= request.items().size() ? request.items().get(answer.item() - 1) : null,
                            answer.answer()))
                    .toList();
            revisions.add(new RevisionResponse(
                    i + 2,
                    supplement.event().getCreatedAt(),
                    note.content(),
                    answers,
                    address,
                    note.newAddress() == null ? null : note.previousAddress(),
                    note.sources(),
                    evidencesByVersion.get(i + 1),
                    request.message(),
                    request.items(),
                    supplement.request() == null ? null : supplement.request().getCreatedAt()));
        }

        return new SubmissionHistoryResponse(submission.getTrackingCode(), submission.getReportCategory(),
                submission.getTitle(), submission.getStatus(), submission.getCreatedAt(), revisions);
    }

    // ================================ HÀM PHỤ ================================

    /** Một lần bổ sung: bước nhật ký của người gửi + lời đề nghị của Biên tập viên ngay trước (có thể null). */
    private record Supplement(SubmissionEvent event, SubmissionEvent request) {
    }

    private record Answer(int item, String answer) {
    }

    /** note của 1 lần bổ sung sau khi tách. content = null nếu Chuyên gia trả lời theo từng mục. */
    private record ParsedNote(String content, List<Answer> answers, String newAddress, String previousAddress,
                              List<SourceResponse> sources) {
    }

    /** Lời đề nghị sau khi tách: lời nhắn + các mục đánh số. */
    private record RequestNote(String message, List<String> items) {
    }

    /**
     * Tệp thuộc phiên bản nào: lần bổ sung MUỘN NHẤT có lời đề nghị trước thời điểm tải tệp
     * (tệp bổ sung luôn tải lên sau lời đề nghị và trước bước nhật ký bổ sung). Không có -> bản gốc (0).
     * Lần bổ sung không tìm thấy lời đề nghị (dữ liệu cũ) thì lấy mốc là lần bổ sung ngay trước.
     */
    private static int versionOf(LocalDateTime uploadedAt, List<Supplement> supplements) {
        if (uploadedAt == null) {
            return 0;
        }
        for (int i = supplements.size() - 1; i >= 0; i--) {
            SubmissionEvent request = supplements.get(i).request();
            LocalDateTime from = request != null ? request.getCreatedAt()
                    : i > 0 ? supplements.get(i - 1).event().getCreatedAt() : null;
            if (from != null && uploadedAt.isAfter(from)) {
                return i + 1;
            }
        }
        return 0;
    }

    /** Tách note của bước bổ sung thành nội dung / câu trả lời / địa chỉ mới / nguồn (xem định dạng ở đầu file). */
    static ParsedNote parseNote(String note) {
        if (note == null || note.isBlank()) {
            return new ParsedNote(null, List.of(), null, null, List.of());
        }
        // LinkedList để lấy dần các khối đặc biệt ở CUỐI note (địa chỉ, nguồn luôn được ghi sau phần nội dung)
        LinkedList<String> blocks = new LinkedList<>(Arrays.asList(note.strip().split("\n\n")));
        String newAddress = null;
        String previousAddress = null;
        List<SourceResponse> sources = new ArrayList<>();
        boolean found = true;
        while (found && !blocks.isEmpty()) {
            String block = blocks.getLast().strip();
            Matcher address = ADDRESS_BLOCK.matcher(block);
            found = false;
            if (block.startsWith(SOURCES_HEAD)) {
                block.lines().skip(1).map(String::strip).forEach(line -> {
                    Matcher source = SOURCE_LINE.matcher(line);
                    if (source.matches()) {
                        sources.add(new SourceResponse(source.group(1), source.group(2)));
                    }
                });
                blocks.removeLast();
                found = true;
            } else if (address.matches()) {
                newAddress = address.group(1);
                previousAddress = address.group(2);
                blocks.removeLast();
                found = true;
            }
        }

        String content = blocks.isEmpty() ? null : String.join("\n\n", blocks).strip();
        List<Answer> answers = new ArrayList<>();
        // Chuyên gia trả lời từng mục: nội dung bắt đầu bằng "Mục 1: " -> cắt tại mỗi "Mục N: " đầu dòng
        if (content != null && content.startsWith("Mục 1: ")) {
            Matcher head = ANSWER_HEAD.matcher(content);
            List<int[]> starts = new ArrayList<>(); // {số mục, vị trí bắt đầu câu trả lời, vị trí đầu dòng "Mục"}
            while (head.find()) {
                starts.add(new int[] {Integer.parseInt(head.group(1)), head.end(), head.start()});
            }
            for (int i = 0; i < starts.size(); i++) {
                int end = i + 1 < starts.size() ? starts.get(i + 1)[2] : content.length();
                answers.add(new Answer(starts.get(i)[0], content.substring(starts.get(i)[1], end).strip()));
            }
            content = null;
        }
        return new ParsedNote(content, answers, newAddress, previousAddress, sources);
    }

    /** Tách lời đề nghị "Lời nhắn\n1. Mục 1\n2. Mục 2" (cách ghi của SubmissionInfoRequestService, cách tách giống splitRequestNote). */
    static RequestNote parseRequest(String note) {
        if (note == null || note.isBlank()) {
            return new RequestNote(null, List.of());
        }
        List<String> message = new ArrayList<>();
        List<String> items = new ArrayList<>();
        // Giống splitRequestNote ở frontend: dòng không đánh số nằm sau 1 mục thì nối vào mục đó
        note.lines().map(String::strip).filter(line -> !line.isEmpty()).forEach(line -> {
            Matcher item = REQUEST_ITEM.matcher(line);
            if (item.matches()) {
                items.add(item.group(2));
            } else if (!items.isEmpty()) {
                items.set(items.size() - 1, items.get(items.size() - 1) + "\n" + line);
            } else {
                message.add(line);
            }
        });
        return new RequestNote(message.isEmpty() ? null : String.join("\n", message), items);
    }
}
