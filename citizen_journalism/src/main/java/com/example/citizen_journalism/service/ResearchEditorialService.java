package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.research.ResearchArticleView;
import com.example.citizen_journalism.entity.Category;
import com.example.citizen_journalism.entity.EditoralReview;
import com.example.citizen_journalism.entity.EditoralReview.RequestStatus;
import com.example.citizen_journalism.entity.EditoralReview.ReviewAction;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.Submission.SubmissionStatus;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.ResearchEditorialRepository;
import com.example.citizen_journalism.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.ObjectMapper;

/**
 * LUỒNG BIÊN TẬP BÀI NGHIÊN CỨU giữa Biên tập viên (BTV) và Chuyên gia — toàn bộ nghiệp vụ nằm trong file này.
 * Luồng: trang React -> services/*.js -> ResearchEditorialController -> service này -> ResearchEditorialRepository.
 *
 * LƯU Ở ĐÂU? Mỗi thao tác của BTV trên 1 bài = 1 dòng bảng editorial_reviews (entity EditoralReview):
 *   - REQUEST_EDIT (yêu cầu chỉnh sửa): cột status = PENDING / ACCEPTED / REJECTED;
 *     content_snapshot = JSON RevisionSnapshot (bản gốc, bản đề xuất, bản cuối, các bình luận trao đổi).
 *   - APPROVE (duyệt) : comments = ghi chú cho Phó TBT; content_snapshot = JSON ApproveSnapshot (điểm chấm, Phó TBT).
 *   - REJECT (từ chối): comments = lý do.
 * research_articles chỉ giữ review_status + priority để lọc hàng đợi và hiện nhãn nhanh.
 *
 * CÁC KHU TRONG FILE:
 *   1. Dữ liệu gửi / nhận với frontend (record)      5. Yêu cầu chỉnh sửa (BTV gửi, 2 bên bình luận, Chuyên gia trả lời)
 *   2. Tiêu chuẩn chấm điểm Low / Medium / High      6. Duyệt / Từ chối bài (BTV) + kết quả cho Chuyên gia
 *   3. Hàng đợi tin bài + Biên tập bài viết          7. Tạo chuyên mục mặc định khi khởi động
 *   4. Chi tiết 1 bài                                8. Hàm phụ
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResearchEditorialService {

    private final ResearchEditorialRepository repository;
    private final ResearchArticleRepository researchArticleRepository;
    private final ResearchArticleService researchArticleService;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    // ============================== 1. DỮ LIỆU GỬI / NHẬN VỚI FRONTEND ==============================

    /** Loại trong hàng đợi: 3 loại hồ sơ phản ánh (trùng tên Submission.ReportCategory) + bài nghiên cứu. */
    public enum QueueType { HOT_NEWS, COMPLAINT, INVESTIGATION, RESEARCH }

    /** 1 dòng hàng đợi. Hồ sơ: code = mã KB-..., researchId = null. Bài nghiên cứu: code = "NC-<id>", province = null. */
    public record QueueItem(QueueType type, String code, Long researchId, String title, SubmissionStatus status,
                            boolean anonymous, String province, String field, LocalDateTime createdAt) {
    }

    /** Tình trạng biên tập (3 giá trị sau trùng tên RequestStatus của yêu cầu chỉnh sửa gần nhất). */
    public enum EditStatus { NOT_EDITED, PENDING, ACCEPTED, REJECTED }

    /** 1 dòng ở màn "Biên tập bài viết". */
    public record ArticleItem(Long id, String code, String title, String field, String authorName,
                              LocalDateTime submittedAt, int revisionCount, EditStatus editStatus,
                              LocalDateTime lastActivityAt, ResearchArticle.ReviewStatus reviewStatus,
                              ResearchArticle.Priority priority) {
    }

    /** 4 ô sửa được của bài: dùng làm dữ liệu gửi lên (BTV đề xuất / Chuyên gia đồng ý) và để hiển thị từng phiên bản. */
    public record Fields(
            @NotBlank(message = "Vui lòng nhập tiêu đề.") @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự.")
            String title,
            @NotBlank(message = "Vui lòng nhập tóm tắt.")
            String abstractText,
            @Size(max = 255, message = "Từ khoá tối đa 255 ký tự.")
            String keywords,
            @NotBlank(message = "Vui lòng nhập nội dung.")
            String content) {
    }

    /** 1 bình luận trao đổi. rejection = true: đây là lý do Chuyên gia từ chối. Vai trò lưu tại lúc viết. */
    public record Comment(String authorId, String authorName, User.Role authorRole, String content, boolean rejection,
                          LocalDateTime createdAt) {
    }

    /** JSON trong cột content_snapshot của dòng REQUEST_EDIT. finalVersion / respondedAt có khi Chuyên gia đã trả lời. */
    public record RevisionSnapshot(Fields original, Fields proposed, Fields finalVersion, LocalDateTime respondedAt,
                                   List<Comment> comments) {
    }

    /** 1 yêu cầu chỉnh sửa gửi cho frontend (id = id dòng editorial_reviews). */
    public record Revision(Long id, Long articleId, String articleTitle, RequestStatus status, String editorName,
                           LocalDateTime createdAt, LocalDateTime respondedAt, Fields original, Fields proposed,
                           Fields finalVersion, boolean expertAdjusted, List<Comment> comments) {
    }

    /** JSON trong cột content_snapshot của dòng APPROVE: lựa chọn của BTV + kết quả chấm + Phó TBT nhận bài. */
    public record ApproveSnapshot(int fieldScore, Conflict conflict, Mention mention, int impactScore,
                                  String deputyId, String deputyName) {
    }

    /** Phần duyệt bài ở trang chi tiết: đã có kết quả (result) HOẶC thông tin điền sẵn form Duyệt (approval). */
    public record Review(ReviewResult result, ApprovalInfo approval) {
    }

    public record ReviewResult(ResearchArticle.ReviewStatus status, ResearchArticle.Priority priority,
                               Integer impactScore, Integer fieldScore, Conflict conflict, Mention mention, String note,
                               String reviewerName, String deputyName, LocalDateTime reviewedAt) {
    }

    /** blockedReason != null: chưa Duyệt được (đang chờ Chuyên gia phản hồi / lĩnh vực chưa có Phó TBT). */
    public record ApprovalInfo(int fieldScore, Conflict suggestedConflict, String deputyName, String blockedReason) {
    }

    /** Chi tiết 1 bài cho BTV: nội dung bài + tác giả + lịch sử yêu cầu chỉnh sửa (mới nhất trước) + phần duyệt. */
    public record Detail(ResearchArticleView article, Author author, List<Revision> revisions, Review review) {
    }

    public record Author(String id, String fullName, String avatarUrl) {
    }

    /** Kết quả duyệt 1 bài, hiện trong thẻ bài của Chuyên gia. reason chỉ có khi bị từ chối. */
    public record MyReviewResult(Long articleId, String articleTitle, ResearchArticle.ReviewStatus status, String reason,
                                 LocalDateTime reviewedAt) {
    }

    public record ApproveBody(
            @NotNull(message = "Vui lòng chọn mức xung đột lợi ích.") Conflict conflict,
            @NotNull(message = "Vui lòng chọn mức nhắc đến cá nhân / tổ chức.") Mention mention,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự.") String note) {
    }

    public record CommentBody(
            @NotBlank(message = "Vui lòng nhập nội dung bình luận.")
            @Size(max = 2000, message = "Bình luận tối đa 2000 ký tự.") String content) {
    }

    public record RejectBody(
            @NotBlank(message = "Vui lòng nhập lý do từ chối.")
            @Size(min = 10, max = 2000, message = "Lý do từ chối từ 10 đến 2000 ký tự.") String reason) {
    }

    // ============================== 2. TIÊU CHUẨN CHẤM ĐIỂM ==============================
    // Tổng (0–10) = Lĩnh vực (0–3, tự động) + Xung đột lợi ích (0–3) + Nhắc đến cá nhân / tổ chức (0–4)
    //   0–3: LOW      4–6: MEDIUM      7–10: HIGH
    // Quy tắc bắt buộc: công kích thiếu dẫn chứng -> luôn HIGH; xung đột không khai báo -> ít nhất MEDIUM.
    // Frontend có bản sao (lib/researchEditorial.js) để tính ngay khi BTV chọn; backend luôn TỰ TÍNH LẠI.

    public enum Conflict {
        NONE(0),        // Không có
        DECLARED(2),    // Có, tác giả đã khai báo
        UNDECLARED(3);  // Có, tác giả KHÔNG khai báo (BTV phát hiện)

        public final int score;

        Conflict(int score) {
            this.score = score;
        }
    }

    public enum Mention {
        NONE(0),                     // Không nêu tên cụ thể
        NEUTRAL(1),                  // Có nêu tên, trung lập (trích dẫn, lấy số liệu)
        CRITICISM_WITH_EVIDENCE(3),  // Phê phán / cáo buộc có dẫn chứng
        ATTACK_WITHOUT_EVIDENCE(4);  // Công kích / cáo buộc thiếu dẫn chứng

        public final int score;

        Mention(int score) {
            this.score = score;
        }
    }

    /** Điểm lĩnh vực theo độ nhạy cảm. Lĩnh vực không có trong bảng (Giáo dục, Giao thông...) -> 1 điểm. */
    private static final Map<String, Integer> FIELD_SCORES = Map.of(
            "Chính trị - Xã hội", 3, "Pháp luật", 3, "Kinh tế", 2, "Y tế - Sức khoẻ", 2, "Đời sống", 0);

    private static int fieldScore(String field) {
        return field == null ? 1 : FIELD_SCORES.getOrDefault(field, 1);
    }

    private static ResearchArticle.Priority priorityOf(int total, Conflict conflict, Mention mention) {
        if (mention == Mention.ATTACK_WITHOUT_EVIDENCE || total >= 7) {
            return ResearchArticle.Priority.HIGH;
        }
        return total >= 4 || conflict == Conflict.UNDECLARED ? ResearchArticle.Priority.MEDIUM : ResearchArticle.Priority.LOW;
    }

    // ============================== 3. HÀNG ĐỢI + BIÊN TẬP BÀI VIẾT ==============================

    /**
     * HÀNG ĐỢI GỘP: hồ sơ phản ánh (bảng submissions) + bài nghiên cứu đã nộp (bảng research_articles).
     * 2 bảng không phân trang chung bằng 1 câu SQL được, nên lấy (page + 1) * size dòng đầu của MỖI bảng
     * (trường hợp xấu nhất cả trang đều thuộc 1 bảng), trộn theo thời gian gửi rồi cắt đúng trang.
     *
     * @param status trạng thái hồ sơ (null = tất cả). Bài nghiên cứu quy đổi theo kết quả duyệt: chờ BTV = PENDING,
     *               đã chuyển Phó TBT = DEPUTY_PENDING, BTV từ chối = REJECTED; trạng thái khác thì không có bài nghiên cứu.
     * @param type   loại (null = tất cả); field: tên lĩnh vực (null / rỗng = tất cả)
     * Thứ tự: đang lọc "chờ tiếp nhận" thì cũ nhất trước (gửi trước xử lý trước), còn lại mới nhất trước.
     */
    @Transactional(readOnly = true)
    public PageResponse<QueueItem> listQueue(SubmissionStatus status, QueueType type, String field, int page, int size) {
        String safeField = field == null || field.isBlank() ? null : field.trim();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        boolean oldestFirst = status == SubmissionStatus.PENDING;
        PageRequest firstRows = PageRequest.of(0, (safePage + 1) * safeSize);
        List<QueueItem> merged = new ArrayList<>();
        long totalItems = 0;

        if (type != QueueType.RESEARCH) {
            Submission.ReportCategory category = type == null ? null : Submission.ReportCategory.valueOf(type.name());
            Page<Submission> rows = repository.searchSubmissions(status, category, safeField,
                    firstRows.withSort(byTime("createdAt", oldestFirst)));
            totalItems += rows.getTotalElements();
            rows.forEach(submission -> merged.add(queueItemOf(submission)));
        }

        boolean researchStatus = status == null || status == SubmissionStatus.PENDING
                || java.util.Arrays.stream(ResearchArticle.ReviewStatus.values()).anyMatch(value -> value.name().equals(status.name()));
        if ((type == null || type == QueueType.RESEARCH) && researchStatus) {
            ResearchArticle.ReviewStatus review = status == null || status == SubmissionStatus.PENDING
                    ? null : ResearchArticle.ReviewStatus.valueOf(status.name());
            Page<ResearchArticle> rows = repository.searchResearch(ResearchArticle.Status.SUBMITTED, safeField,
                    status == null, review, firstRows.withSort(byTime("submittedAt", oldestFirst)));
            totalItems += rows.getTotalElements();
            rows.forEach(article -> merged.add(queueItemOf(article)));
        }

        Comparator<LocalDateTime> timeOrder = oldestFirst ? Comparator.naturalOrder() : Comparator.reverseOrder();
        merged.sort(Comparator.comparing(QueueItem::createdAt, Comparator.nullsLast(timeOrder)));
        int from = Math.min(safePage * safeSize, merged.size());
        int to = Math.min(from + safeSize, merged.size());
        int totalPages = (int) ((totalItems + safeSize - 1) / safeSize);
        return new PageResponse<>(List.copyOf(merged.subList(from, to)), safePage, safeSize, totalItems, totalPages);
    }

    /** Ô lọc "Lĩnh vực" = các chuyên mục toà soạn đang bật (lọc theo tên nên dùng được cho cả hồ sơ lẫn bài nghiên cứu). */
    @Transactional(readOnly = true)
    public List<String> listFields() {
        return repository.findActiveCategoryNames();
    }

    /**
     * Màn "BIÊN TẬP BÀI VIẾT": bài nghiên cứu đã nộp + tình trạng biên tập, bài nộp gần nhất lên đầu.
     * editStatus / field / keyword: null hoặc rỗng = không lọc.
     */
    @Transactional(readOnly = true)
    public PageResponse<ArticleItem> listArticles(EditStatus editStatus, String field, String keyword, int page, int size) {
        boolean notEdited = editStatus == EditStatus.NOT_EDITED;
        RequestStatus latestStatus = editStatus == null || notEdited ? null : RequestStatus.valueOf(editStatus.name());
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Order.desc("submittedAt"), Sort.Order.desc("id")));
        return PageResponse.from(repository.searchArticlesForEditing(ResearchArticle.Status.SUBMITTED,
                        field == null || field.isBlank() ? null : field.trim(),
                        keyword == null || keyword.isBlank() ? null : keyword.trim(),
                        notEdited, latestStatus, pageable)
                .map(article -> {
                    List<EditoralReview> rows = repository.findByResearchArticleIdOrderByIdDesc(article.getId());
                    List<EditoralReview> requests = requestsOf(rows);
                    EditoralReview latest = requests.isEmpty() ? null : requests.get(0);
                    EditoralReview decision = decisionOf(rows);
                    // Cập nhật gần nhất: lúc duyệt / từ chối > lần thay đổi gần nhất của yêu cầu (gửi, bình luận, trả lời) > lúc nộp
                    LocalDateTime lastActivityAt = decision != null ? decision.getCreatedAt()
                            : latest != null ? latest.getUpdatedAt() : article.getSubmittedAt();
                    return new ArticleItem(article.getId(), "NC-" + article.getId(), article.getTitle(), article.getField(),
                            article.getAuthor().getFullName(), article.getSubmittedAt(), requests.size(),
                            latest == null ? EditStatus.NOT_EDITED : EditStatus.valueOf(latest.getStatus().name()),
                            lastActivityAt, article.getReviewStatus(), article.getPriority());
                }));
    }

    // ============================== 4. CHI TIẾT 1 BÀI (BTV) ==============================

    /** Chi tiết bài đã nộp (bản nháp / không có -> 404). Nội dung bài đọc qua ResearchArticleService (dùng lại cách đọc ảnh, đếm chữ). */
    @Transactional(readOnly = true)
    public Detail getDetail(Long articleId) {
        ResearchArticleView view = researchArticleService.getSubmittedForStaff(articleId);
        ResearchArticle article = findSubmitted(articleId);
        User author = article.getAuthor();
        List<EditoralReview> rows = repository.findByResearchArticleIdOrderByIdDesc(articleId);
        return new Detail(view, new Author(author.getId(), author.getFullName(), author.getAvatarUrl()),
                requestsOf(rows).stream().map(this::toRevision).toList(), reviewOf(article, rows));
    }

    // ============================== 5. YÊU CẦU CHỈNH SỬA ==============================

    /**
     * BTV gửi yêu cầu chỉnh sửa. Điều kiện: bài đã nộp (404), chưa duyệt / từ chối (409), chưa có yêu cầu chờ (409),
     * bản đề xuất đạt điều kiện nộp bài (lỗi dưới từng ô), có thay đổi so với bài (400). Bài gốc giữ nguyên.
     */
    @Transactional
    public Revision requestRevision(String editorId, Long articleId, Fields body) {
        User editor = userRepository.getActiveById(editorId);
        ResearchArticle article = findSubmitted(articleId);
        List<EditoralReview> rows = repository.findByResearchArticleIdOrderByIdDesc(articleId);
        if (decisionOf(rows) != null) {
            throw AppException.conflict("Bài đã được duyệt / từ chối, không gửi yêu cầu chỉnh sửa được nữa.");
        }
        if (hasPendingRequest(rows)) {
            throw AppException.conflict(PENDING_MESSAGE);
        }
        Fields original = new Fields(article.getTitle(), article.getAbstractText(), article.getKeywords(), article.getContent());
        Fields proposed = checkFields(body);
        if (proposed.equals(clean(original))) {
            throw AppException.badRequest("Bạn chưa thay đổi gì so với bài gốc.");
        }

        EditoralReview row = repository.save(EditoralReview.builder()
                .researchArticle(article)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(ReviewAction.REQUEST_EDIT)
                .status(RequestStatus.PENDING)
                .contentSnapshot(toJson(new RevisionSnapshot(original, proposed, null, null, List.of())))
                .build());

        sendMail(article.getAuthor(), "[Tin Nóng Dân Sinh] Đề xuất chỉnh sửa bài nghiên cứu",
                "Biên tập viên <b>%s</b> đã đề xuất chỉnh sửa bài nghiên cứu <b>\"%s\"</b> của bạn.</p><p>"
                        .formatted(escape(editor.getFullName()), escape(article.getTitle()))
                        + "Bài của bạn chưa bị thay đổi. Vào mục <b>Bài nghiên cứu của tôi</b> để xem, trao đổi và phản hồi.");
        return toRevision(row);
    }

    /** Các yêu cầu gửi tới bài của Chuyên gia này, mới nhất trước. */
    @Transactional(readOnly = true)
    public List<Revision> listMyRevisions(String expertId) {
        userRepository.getActiveById(expertId);
        return requestsOf(repository.findByResearchArticleAuthorIdOrderByIdDesc(expertId)).stream()
                .map(this::toRevision).toList();
    }

    /** 1 yêu cầu, chỉ khi thuộc bài của đúng Chuyên gia này (đổi id trên đường dẫn cũng không xem được bài người khác). */
    @Transactional(readOnly = true)
    public Revision getMyRevision(String expertId, Long revisionId) {
        userRepository.getActiveById(expertId);
        return toRevision(findRequest(revisionId, expertId));
    }

    /** Bình luận trong yêu cầu đang chờ. BTV bình luận mọi yêu cầu; Chuyên gia chỉ bình luận yêu cầu thuộc bài của mình. */
    @Transactional
    public Revision comment(String userId, Long revisionId, String content) {
        User user = userRepository.getActiveById(userId);
        EditoralReview row = findRequest(revisionId, user.getRole() == User.Role.EXPERT ? userId : null);
        RevisionSnapshot snapshot = readPending(row);
        saveSnapshot(row, snapshot, snapshot.finalVersion(), snapshot.respondedAt(), commentOf(user, content, false));
        return toRevision(row);
    }

    /**
     * Chuyên gia ĐỒNG Ý. body = bản cuối: đúng bản đề xuất hoặc bản Chuyên gia đã điều chỉnh.
     * Áp 4 ô vào bài (JPA tự ghi xuống DB khi hết transaction, không cần save) và lưu bản cuối vào yêu cầu.
     */
    @Transactional
    public Revision acceptRevision(String expertId, Long revisionId, Fields body) {
        userRepository.getActiveById(expertId);
        EditoralReview row = findRequest(revisionId, expertId);
        RevisionSnapshot snapshot = readPending(row);
        Fields finalVersion = checkFields(body);

        ResearchArticle article = row.getResearchArticle();
        article.setTitle(finalVersion.title());
        article.setAbstractText(finalVersion.abstractText());
        article.setKeywords(finalVersion.keywords());
        article.setContent(finalVersion.content());
        row.setStatus(RequestStatus.ACCEPTED);
        saveSnapshot(row, snapshot, finalVersion, LocalDateTime.now(), null);

        mailEditorAboutReply(row, "đã <b>đồng ý</b> với đề xuất chỉnh sửa. Nội dung bài đã được cập nhật.");
        return toRevision(row);
    }

    /** Chuyên gia TỪ CHỐI: lý do lưu thành 1 bình luận (rejection = true). Bài giữ nguyên. */
    @Transactional
    public Revision rejectRevision(String expertId, Long revisionId, String reason) {
        User expert = userRepository.getActiveById(expertId);
        EditoralReview row = findRequest(revisionId, expertId);
        RevisionSnapshot snapshot = readPending(row);
        row.setStatus(RequestStatus.REJECTED);
        saveSnapshot(row, snapshot, null, LocalDateTime.now(), commentOf(expert, reason, true));

        mailEditorAboutReply(row, "đã <b>từ chối</b> đề xuất chỉnh sửa. Lý do: " + escape(reason.trim()));
        return toRevision(row);
    }

    // ============================== 6. DUYỆT / TỪ CHỐI BÀI ==============================

    /**
     * BTV DUYỆT: chấm điểm (backend tự tính lại), ghi 1 dòng APPROVE, chuyển bài tới Phó TBT phụ trách lĩnh vực
     * (categories.deputy_eic_id), email báo Phó TBT và tác giả.
     * Bị chặn khi: đã có kết quả, đang có yêu cầu chỉnh sửa chờ, hoặc lĩnh vực chưa có Phó TBT.
     */
    @Transactional
    public Review approve(String editorId, Long articleId, ApproveBody body) {
        User editor = userRepository.getActiveById(editorId);
        ResearchArticle article = findSubmitted(articleId);
        List<EditoralReview> rows = repository.findByResearchArticleIdOrderByIdDesc(articleId);
        requireNoDecision(rows);
        User deputy = findDeputy(article);
        String blockedReason = blockedReason(article, rows, deputy);
        if (blockedReason != null) {
            throw AppException.conflict(blockedReason);
        }

        int field = fieldScore(article.getField());
        int total = field + body.conflict().score + body.mention().score;
        article.setReviewStatus(ResearchArticle.ReviewStatus.DEPUTY_PENDING);
        article.setPriority(priorityOf(total, body.conflict(), body.mention()));
        String note = body.note() == null || body.note().isBlank() ? null : body.note().trim();
        EditoralReview decision = repository.save(EditoralReview.builder()
                .researchArticle(article)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(ReviewAction.APPROVE)
                .comments(note)
                .contentSnapshot(toJson(new ApproveSnapshot(field, body.conflict(), body.mention(), total,
                        deputy.getId(), deputy.getFullName())))
                .build());

        sendMail(deputy, "[Tin Nóng Dân Sinh] Bài nghiên cứu chờ Phó TBT duyệt (mức %s)".formatted(article.getPriority()),
                "Biên tập viên <b>%s</b> đã duyệt bài nghiên cứu <b>\"%s\"</b> (NC-%d, lĩnh vực %s) và chuyển tới bạn. "
                        .formatted(escape(editor.getFullName()), escape(article.getTitle()), article.getId(), escape(article.getField()))
                        + "Mức độ: <b>%s</b> (%d/10 điểm).".formatted(article.getPriority(), total)
                        + (note == null ? "" : "</p><p>Ghi chú của Biên tập viên: " + escape(note)));
        sendMail(article.getAuthor(), "[Tin Nóng Dân Sinh] Bài nghiên cứu đã được Biên tập viên duyệt",
                "Bài nghiên cứu <b>\"%s\"</b> của bạn đã được Biên tập viên duyệt và chuyển tới Phó Tổng biên tập xem xét."
                        .formatted(escape(article.getTitle())));
        return new Review(toResult(article, decision), null);
    }

    /** BTV TỪ CHỐI (bắt buộc lý do): ghi 1 dòng REJECT, bài DỪNG xử lý (vẫn là SUBMITTED), email báo tác giả. */
    @Transactional
    public Review reject(String editorId, Long articleId, String reason) {
        User editor = userRepository.getActiveById(editorId);
        ResearchArticle article = findSubmitted(articleId);
        List<EditoralReview> rows = repository.findByResearchArticleIdOrderByIdDesc(articleId);
        requireNoDecision(rows);
        if (hasPendingRequest(rows)) {
            throw AppException.conflict(PENDING_MESSAGE);
        }

        article.setReviewStatus(ResearchArticle.ReviewStatus.REJECTED);
        EditoralReview decision = repository.save(EditoralReview.builder()
                .researchArticle(article)
                .reviewer(editor)
                .reviewRole(EditoralReview.ReviewRole.EDITOR)
                .action(ReviewAction.REJECT)
                .comments(reason.trim())
                .build());

        sendMail(article.getAuthor(), "[Tin Nóng Dân Sinh] Bài nghiên cứu không được duyệt",
                "Rất tiếc, bài nghiên cứu <b>\"%s\"</b> của bạn <b>không được duyệt</b>.</p><p>Lý do: %s"
                        .formatted(escape(article.getTitle()), escape(reason.trim())));
        return new Review(toResult(article, decision), null);
    }

    /** Kết quả duyệt các bài của Chuyên gia (hiện trong thẻ bài ở trang "Bài nghiên cứu của tôi"). */
    @Transactional(readOnly = true)
    public List<MyReviewResult> listMyReviewResults(String expertId) {
        userRepository.getActiveById(expertId);
        return repository.findByResearchArticleAuthorIdOrderByIdDesc(expertId).stream()
                .filter(row -> row.getAction() != ReviewAction.REQUEST_EDIT)
                .map(row -> new MyReviewResult(row.getResearchArticle().getId(), row.getResearchArticle().getTitle(),
                        row.getResearchArticle().getReviewStatus(),
                        row.getAction() == ReviewAction.REJECT ? row.getComments() : null, row.getCreatedAt()))
                .toList();
    }

    // ============================== 7. CHUYÊN MỤC MẶC ĐỊNH ==============================

    /**
     * Chạy 1 lần khi backend khởi động xong: bảng categories còn rỗng thì tạo 5 chuyên mục mặc định
     * (ô lọc "Lĩnh vực" cần dữ liệu mà chưa có màn hình Admin quản lý chuyên mục). Đã có dòng nào thì không làm gì.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void createDefaultCategories() {
        if (repository.countCategories() == 0) {
            repository.insertDefaultCategories();
            log.info("Đã tạo 5 chuyên mục mặc định của toà soạn.");
        }
    }

    // ============================== 8. HÀM PHỤ ==============================

    private static final String PENDING_MESSAGE =
            "Bài đang có yêu cầu chỉnh sửa chờ Chuyên gia phản hồi. Vui lòng chờ Chuyên gia trả lời trước.";

    /** Bài đã nộp; bản nháp / không có -> 404. */
    private ResearchArticle findSubmitted(Long articleId) {
        return researchArticleRepository.findById(articleId)
                .filter(found -> found.getStatus() == ResearchArticle.Status.SUBMITTED)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy bài nghiên cứu."));
    }

    /** 1 yêu cầu chỉnh sửa theo id. ownerId != null: chỉ khi thuộc bài của đúng Chuyên gia đó. Không thấy -> 404. */
    private EditoralReview findRequest(Long revisionId, String ownerId) {
        return repository.findById(revisionId)
                .filter(row -> row.getAction() == ReviewAction.REQUEST_EDIT && row.getResearchArticle() != null)
                .filter(row -> ownerId == null || ownerId.equals(row.getResearchArticle().getAuthor().getId()))
                .orElseThrow(() -> AppException.notFound("Không tìm thấy yêu cầu chỉnh sửa."));
    }

    private static List<EditoralReview> requestsOf(List<EditoralReview> rows) {
        return rows.stream().filter(row -> row.getAction() == ReviewAction.REQUEST_EDIT).toList();
    }

    /** Dòng Duyệt / Từ chối của bài (mỗi bài có tối đa 1 dòng), chưa có thì null. */
    private static EditoralReview decisionOf(List<EditoralReview> rows) {
        return rows.stream().filter(row -> row.getReviewRole() == EditoralReview.ReviewRole.EDITOR
                && (row.getAction() == ReviewAction.APPROVE || row.getAction() == ReviewAction.REJECT)).findFirst().orElse(null);
    }

    private static boolean hasPendingRequest(List<EditoralReview> rows) {
        return rows.stream().anyMatch(row -> row.getStatus() == RequestStatus.PENDING);
    }

    private static void requireNoDecision(List<EditoralReview> rows) {
        if (decisionOf(rows) != null) {
            throw AppException.conflict("Bài này đã được duyệt / từ chối trước đó.");
        }
    }

    /** Phần duyệt ở trang chi tiết: kết quả đã có, hoặc thông tin điền sẵn form Duyệt. */
    private Review reviewOf(ResearchArticle article, List<EditoralReview> rows) {
        EditoralReview decision = decisionOf(rows);
        if (decision != null) {
            return new Review(toResult(article, decision), null);
        }
        User deputy = findDeputy(article);
        Conflict suggested = Boolean.TRUE.equals(article.getHasConflict()) ? Conflict.DECLARED : Conflict.NONE;
        return new Review(null, new ApprovalInfo(fieldScore(article.getField()), suggested,
                deputy == null ? null : deputy.getFullName(), blockedReason(article, rows, deputy)));
    }

    private ReviewResult toResult(ResearchArticle article, EditoralReview decision) {
        ApproveSnapshot score = decision.getContentSnapshot() == null ? null
                : objectMapper.readValue(decision.getContentSnapshot(), ApproveSnapshot.class);
        return new ReviewResult(article.getReviewStatus(), article.getPriority(),
                score == null ? null : score.impactScore(), score == null ? null : score.fieldScore(),
                score == null ? null : score.conflict(), score == null ? null : score.mention(),
                decision.getComments(), decision.getReviewer().getFullName(),
                score == null ? null : score.deputyName(), decision.getCreatedAt());
    }

    /** Lý do chưa DUYỆT được (null = duyệt được). */
    private static String blockedReason(ResearchArticle article, List<EditoralReview> rows, User deputy) {
        if (hasPendingRequest(rows)) {
            return PENDING_MESSAGE;
        }
        if (deputy == null) {
            return "Lĩnh vực \"%s\" chưa có Phó Tổng biên tập phụ trách. Vui lòng liên hệ quản trị viên để phân công."
                    .formatted(Objects.toString(article.getField(), "chưa chọn"));
        }
        return null;
    }

    /** Phó TBT = categories.deputy_eic_id của chuyên mục trùng tên lĩnh vực; tài khoản phải đang hoạt động, đúng vai trò. */
    private User findDeputy(ResearchArticle article) {
        if (article.getField() == null) {
            return null;
        }
        return repository.findDeputiesOfCategory(article.getField()).stream()
                .filter(user -> user.getStatus() == User.Status.ACTIVE && user.getRole() == User.Role.DEPUTY_EIC)
                .findFirst().orElse(null);
    }

    private Revision toRevision(EditoralReview row) {
        RevisionSnapshot s = objectMapper.readValue(row.getContentSnapshot(), RevisionSnapshot.class);
        ResearchArticle article = row.getResearchArticle();
        return new Revision(row.getId(), article.getId(), article.getTitle(), row.getStatus(),
                row.getReviewer().getFullName(), row.getCreatedAt(), s.respondedAt(), s.original(), s.proposed(),
                s.finalVersion(), s.finalVersion() != null && !s.finalVersion().equals(s.proposed()), s.comments());
    }

    /** Đọc JSON của yêu cầu; đã xử lý xong (không còn PENDING) thì 409 — chỉ yêu cầu đang chờ mới bình luận / trả lời được. */
    private RevisionSnapshot readPending(EditoralReview row) {
        if (row.getStatus() != RequestStatus.PENDING) {
            throw AppException.conflict("Yêu cầu chỉnh sửa này đã được xử lý xong.");
        }
        return objectMapper.readValue(row.getContentSnapshot(), RevisionSnapshot.class);
    }

    /** Ghi lại JSON của yêu cầu với bản cuối / thời điểm trả lời mới, và thêm 1 bình luận (newComment có thể null). */
    private void saveSnapshot(EditoralReview row, RevisionSnapshot old, Fields finalVersion, LocalDateTime respondedAt,
                              Comment newComment) {
        List<Comment> comments = new ArrayList<>(old.comments());
        if (newComment != null) {
            comments.add(newComment);
        }
        row.setContentSnapshot(toJson(new RevisionSnapshot(old.original(), old.proposed(), finalVersion, respondedAt, comments)));
    }

    private static Comment commentOf(User author, String content, boolean rejection) {
        return new Comment(author.getId(), author.getFullName(), author.getRole(), content.trim(), rejection, LocalDateTime.now());
    }

    private String toJson(Object value) {
        return objectMapper.writeValueAsString(value);
    }

    /** Bỏ khoảng trắng thừa đầu / cuối; từ khoá để trống thì thành null như bài gốc. */
    private static Fields clean(Fields fields) {
        String keywords = fields.keywords() == null || fields.keywords().isBlank() ? null : fields.keywords().trim();
        return new Fields(Objects.toString(fields.title(), "").trim(), Objects.toString(fields.abstractText(), "").trim(),
                keywords, Objects.toString(fields.content(), "").trim());
    }

    /** Làm sạch rồi kiểm tra cùng ngưỡng với lúc Chuyên gia nộp bài (hằng số trong ResearchArticleService). */
    private static Fields checkFields(Fields body) {
        Fields fields = clean(body);
        Map<String, String> errors = new LinkedHashMap<>();
        if (fields.title().length() < ResearchArticleService.MIN_TITLE_LENGTH) {
            errors.put("title", "Tiêu đề tối thiểu " + ResearchArticleService.MIN_TITLE_LENGTH + " ký tự.");
        }
        if (fields.abstractText().length() < ResearchArticleService.MIN_ABSTRACT_LENGTH) {
            errors.put("abstractText", "Tóm tắt tối thiểu " + ResearchArticleService.MIN_ABSTRACT_LENGTH + " ký tự.");
        }
        // Đếm chữ cùng cách với ResearchArticleService / lib/research.js: tách theo khoảng trắng
        int words = fields.content().isEmpty() ? 0 : fields.content().split("\\s+").length;
        if (words < ResearchArticleService.MIN_WORDS) {
            errors.put("content", "Nội dung tối thiểu " + ResearchArticleService.MIN_WORDS + " chữ.");
        }
        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }
        return fields;
    }

    private static Sort byTime(String timeField, boolean oldestFirst) {
        return oldestFirst
                ? Sort.by(Sort.Order.asc(timeField), Sort.Order.asc("id"))
                : Sort.by(Sort.Order.desc(timeField), Sort.Order.desc("id"));
    }

    private static QueueItem queueItemOf(Submission submission) {
        // Chuyên mục do toà soạn gán sau nên thường còn trống -> frontend hiện "NA"
        Category category = submission.getCategory();
        return new QueueItem(submission.getReportCategory() == null ? null : QueueType.valueOf(submission.getReportCategory().name()),
                submission.getTrackingCode(), null, submission.getTitle(), submission.getStatus(),
                Boolean.TRUE.equals(submission.getIsAnonymous()), submission.getProvince(),
                category == null ? null : category.getName(), submission.getCreatedAt());
    }

    private static QueueItem queueItemOf(ResearchArticle article) {
        SubmissionStatus status = article.getReviewStatus() == null ? SubmissionStatus.PENDING
                : SubmissionStatus.valueOf(article.getReviewStatus().name());
        LocalDateTime sentAt = article.getSubmittedAt() != null ? article.getSubmittedAt() : article.getCreatedAt();
        return new QueueItem(QueueType.RESEARCH, "NC-" + article.getId(), article.getId(), article.getTitle(), status,
                false, null, article.getField(), sentAt);
    }

    /** Email báo BTV kết quả Chuyên gia trả lời. resultHtml: phần chữ người dùng nhập đã được escape. */
    private void mailEditorAboutReply(EditoralReview row, String resultHtml) {
        ResearchArticle article = row.getResearchArticle();
        sendMail(row.getReviewer(), "[Tin Nóng Dân Sinh] Phản hồi đề xuất chỉnh sửa bài nghiên cứu",
                "Chuyên gia <b>%s</b> %s</p><p>Bài: <b>\"%s\"</b> (NC-%d)."
                        .formatted(escape(article.getAuthor().getFullName()), resultHtml, escape(article.getTitle()), article.getId()));
    }

    /** Khung email chung của dự án. bodyHtml nằm trong 1 thẻ <p>. Gửi lỗi chỉ ghi log, không làm hỏng thao tác chính. */
    private void sendMail(User recipient, String subject, String bodyHtml) {
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;
                            border:1px solid #dfe5ef;border-radius:12px;color:#172339">
                  <h2 style="margin:0 0 4px;color:#0d1f35">TIN NÓNG DÂN SINH</h2>
                  <p>Xin chào <b>%s</b>,</p>
                  <p>%s</p>
                </div>
                """.formatted(escape(recipient.getFullName()), bodyHtml);
        try {
            mailService.send(recipient.getEmail(), subject, html);
        } catch (AppException ex) {
            log.warn("Cannot send editorial mail to {}", recipient.getId());
        }
    }

    private static String escape(String text) {
        return HtmlUtils.htmlEscape(Objects.toString(text, ""));
    }
}
