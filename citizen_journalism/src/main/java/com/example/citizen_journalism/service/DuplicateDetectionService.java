package com.example.citizen_journalism.service;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEmbedding;
import com.example.citizen_journalism.entity.SubmissionEmbedding.ChunkType;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.repository.SubmissionEmbeddingRepository;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * PHÁT HIỆN TIN TRÙNG BẰNG RAG (UC Editor "Check for Duplication") — phần AI chạy nền.
 * Màn hình và các thao tác của Biên tập viên: DuplicateReviewService.
 *
 * Các bước của 1 lần quét (runCheck):
 *   1. LẬP CHỈ MỤC: cắt chữ của hồ sơ thành đoạn (tiêu đề, nội dung), tạo vector (TextEmbeddingService), lưu bảng
 *      submission_embeddings. Hồ sơ cũ trong cửa sổ windowDays ngày chưa có chỉ mục (hoặc tạo bằng model khác) cũng
 *      được lập luôn, nên không cần sửa luồng gửi hồ sơ. Chỉ so chữ: ảnh, audio, video không xét (nhóm quyết định 2026-11-03).
 *   2. TRUY XUẤT (Retrieval): so vector từng đoạn nội dung với các hồ sơ trong cửa sổ, cộng thêm tín hiệu tiêu đề,
 *      cùng tỉnh/thành, thời gian xảy ra -> chọn tối đa topK hồ sơ giống nhất.
 *   3. SINH KẾT LUẬN (Augmented Generation): gửi hồ sơ mới + các hồ sơ vừa truy xuất cho model chat
 *      (DuplicateJudgeService) chấm % trùng, nêu lý do và các cụm từ giống nhau. Không gọi được AI thì dùng điểm ở bước 2.
 *   4. GHI KẾT QUẢ: 1 dòng submission_events (actor SYSTEM, description bắt đầu CHECK_MARKER, note = JSON StoredResult);
 *      tóm tắt AI (nếu có) ghi vào submissions.ai_summary.
 *      Không thêm cột / bảng nào khác (quyết định của nhóm 2026-11-03). Dòng mới nhất là kết quả hiện tại.
 *
 * Các dòng nhật ký có mã "[DUPLICATE_" là dữ liệu NỘI BỘ: SubmissionTrackingService bỏ chúng khỏi nhật ký người gửi xem.
 * Quét chạy trên luồng riêng (requestCheck), màn hình hiện "đang quét" cho tới khi có kết quả. Chỉ 1 luồng quét:
 * 2 lần quét chạy song song sẽ cùng lập chỉ mục cho các hồ sơ cũ chung cửa sổ, gây deadlock / trùng dòng trong DB.
 */
@Slf4j
@Service
public class DuplicateDetectionService {

    /** Mã đầu description của dòng kết quả AI. */
    public static final String CHECK_MARKER = "[DUPLICATE_CHECK]";
    /** Mã đầu description của dòng kết luận của Biên tập viên (xem DuplicateReviewService). */
    public static final String REVIEW_MARKER = "[DUPLICATE_REVIEW]";
    private static final String INTERNAL_PREFIX = "[DUPLICATE_";

    /** Độ dài tối đa 1 đoạn nội dung và số đoạn tối đa của 1 hồ sơ. */
    static final int CHUNK_MAX_CHARS = 600;
    static final int MAX_CONTENT_CHUNKS = 12;
    /** Số hồ sơ tối đa đem ra so trong 1 lần quét (mới nhất trước). */
    static final int MAX_POOL = 300;

    private final SubmissionRepository submissionRepository;
    private final SubmissionEmbeddingRepository embeddingRepository;
    private final SubmissionEventRepository eventRepository;
    private final TextEmbeddingService textEmbeddingService;
    private final DuplicateJudgeService judgeService;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactions;

    private final int threshold;
    private final int windowDays;
    private final int topK;

    /** Hồ sơ đang quét (id), để không chạy 2 lần quét cùng lúc cho 1 hồ sơ. */
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    private final ExecutorService executor = Executors.newSingleThreadExecutor(task -> {
        Thread thread = new Thread(task, "duplicate-check");
        thread.setDaemon(true);
        return thread;
    });

    public DuplicateDetectionService(SubmissionRepository submissionRepository,
                                     SubmissionEmbeddingRepository embeddingRepository,
                                     SubmissionEventRepository eventRepository,
                                     TextEmbeddingService textEmbeddingService,
                                     DuplicateJudgeService judgeService,
                                     ObjectMapper objectMapper,
                                     PlatformTransactionManager transactionManager,
                                     @Value("${app.duplicate.threshold:60}") int threshold,
                                     @Value("${app.duplicate.window-days:30}") int windowDays,
                                     @Value("${app.duplicate.top-k:5}") int topK) {
        this.submissionRepository = submissionRepository;
        this.embeddingRepository = embeddingRepository;
        this.eventRepository = eventRepository;
        this.textEmbeddingService = textEmbeddingService;
        this.judgeService = judgeService;
        this.objectMapper = objectMapper;
        this.transactions = new TransactionTemplate(transactionManager);
        this.threshold = threshold;
        this.windowDays = windowDays;
        this.topK = topK;
    }

    // ============================ KẾT QUẢ LƯU TRONG submission_events.note ============================

    /**
     * Kết quả 1 lần quét (JSON trong note). Chỉ lưu những gì AI tính ra; tiêu đề, nội dung, trạng thái... của hồ sơ
     * gợi ý đọc lại từ DB lúc hiển thị để luôn mới.
     *
     * @param textModel        model tạo vector đoạn chữ
     * @param judgeModel       "ai" khi model chat đã kết luận, "heuristic" khi dùng điểm truy xuất
     * @param summary          tóm tắt ngắn của model chat (null khi không có AI)
     */
    @JsonIgnoreProperties(ignoreUnknown = true) // kết quả cũ còn spamScore / credibilityScore (đã bỏ 2026-11-03)
    public record StoredResult(String textModel, String judgeModel, String summary, int threshold, int windowDays, List<StoredCandidate> candidates) {
    }

    /**
     * @param similarity          % trùng cuối cùng (0–100)
     * @param contentSimilarity   % giống nội dung theo vector
     * @param minutesApart        chênh lệch thời điểm xảy ra (hoặc thời điểm gửi) tính bằng phút
     * @param matchedPhrases      cụm từ xuất hiện nguyên văn ở cả 2 hồ sơ
     */
    public record StoredCandidate(Long submissionId, String trackingCode, int similarity, int contentSimilarity,
                                  boolean sameProvince, long minutesApart, List<String> matchedPhrases, String reason) {
    }

    /** Dòng nhật ký của Kiểm tra tin trùng (kết quả AI hoặc kết luận BTV): không cho người gửi xem. */
    public static boolean isInternalEvent(SubmissionEvent event) {
        return event.getDescription() != null && event.getDescription().startsWith(INTERNAL_PREFIX);
    }

    public int getThreshold() {
        return threshold;
    }

    public int getWindowDays() {
        return windowDays;
    }

    public boolean isRunning(Long submissionId) {
        return running.contains(submissionId);
    }

    /** Xếp lịch quét trên luồng nền; đang quét rồi thì bỏ qua. */
    public void requestCheck(Long submissionId) {
        if (!running.add(submissionId)) {
            return;
        }
        executor.submit(() -> {
            try {
                runCheck(submissionId);
            } catch (RuntimeException ex) {
                log.error("Kiểm tra tin trùng cho hồ sơ id={} bị lỗi", submissionId, ex);
            } finally {
                running.remove(submissionId);
            }
        });
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }

    /** Quét ngay trên luồng hiện tại (luồng nền gọi; test gọi trực tiếp). */
    public StoredResult runCheck(Long submissionId) {
        Analysis analysis = transactions.execute(status -> analyse(submissionId));
        if (analysis == null) {
            return null;
        }
        DuplicateJudgeService.Judgement judgement = judgeService.judge(analysis.self(), analysis.candidates());
        StoredResult result = buildResult(analysis, judgement);
        String note = objectMapper.writeValueAsString(result);
        transactions.executeWithoutResult(status -> {
            Submission submission = submissionRepository.findById(submissionId).orElse(null);
            if (submission == null) {
                return;
            }
            // Tóm tắt 1-2 câu của model chat -> cột submissions.ai_summary (quét lại sau khi bổ sung thông tin thì ghi đè).
            // Không có AI (heuristic) thì giữ nguyên giá trị cũ.
            if (result.summary() != null && !result.summary().isBlank()) {
                submission.setAiSummary(result.summary().trim());
                submissionRepository.save(submission);
            }
            int count = result.candidates().size();
            eventRepository.save(SubmissionEvent.builder()
                    .submission(submission)
                    .status(submission.getStatus()) // Không đổi trạng thái hồ sơ
                    .actor(SubmissionEvent.Actor.SYSTEM)
                    .description(CHECK_MARKER + (count == 0
                            ? " Không tìm thấy hồ sơ tương tự."
                            : " Tìm thấy " + count + " hồ sơ tương tự."))
                    .note(note)
                    .build());
        });
        return result;
    }

    // ============================ BƯỚC 1 + 2: LẬP CHỈ MỤC, TRUY XUẤT ============================

    /** Hồ sơ đang xét và các hồ sơ truy xuất được (đã chấm điểm, giống nhất trước). */
    record Analysis(Doc self, List<Scored> candidates, String textModel) {
    }

    /** Ảnh chụp dữ liệu 1 hồ sơ đủ dùng ngoài transaction (gửi cho model chat). */
    record Doc(Long id, String trackingCode, String title, String summary, String content, String province,
               String address, LocalDateTime when) {

        String fullText() {
            return String.join("\n", nonBlank(title), nonBlank(summary), nonBlank(content)).trim();
        }

        private static String nonBlank(String value) {
            return value == null ? "" : value;
        }
    }

    /** 1 hồ sơ truy xuất được và các tín hiệu so với hồ sơ đang xét. */
    record Scored(Doc doc, int contentSimilarity, int titleSimilarity, boolean sameProvince, long minutesApart,
                  int score, List<String> matchedPhrases) {
    }

    private Analysis analyse(Long submissionId) {
        Submission self = submissionRepository.findById(submissionId).orElse(null);
        if (self == null) {
            return null;
        }
        List<SubmissionEmbedding> selfRows = index(self, textEmbeddingService.currentModel());
        String model = selfRows.stream()
                .map(SubmissionEmbedding::getModel)
                .findFirst()
                .orElse(textEmbeddingService.currentModel());

        LocalDateTime base = self.getCreatedAt() == null ? LocalDateTime.now() : self.getCreatedAt();
        List<Submission> pool = submissionRepository.findDuplicateCheckPool(
                self.getId(), base.minusDays(windowDays), PageRequest.of(0, MAX_POOL));
        if (pool.isEmpty()) {
            return new Analysis(docOf(self), List.of(), model);
        }

        // Hồ sơ chưa có chỉ mục bằng model hiện tại thì lập luôn (dữ liệu cũ, hoặc vừa đổi model)
        List<Long> poolIds = pool.stream().map(Submission::getId).toList();
        Set<Long> indexed = new HashSet<>(embeddingRepository.findIndexedSubmissionIds(poolIds, model));
        for (Submission other : pool) {
            if (!indexed.contains(other.getId())) {
                index(other, model);
            }
        }

        Map<Long, List<SubmissionEmbedding>> rowsBySubmission = new HashMap<>();
        for (SubmissionEmbedding row : embeddingRepository.findBySubmissionIds(poolIds)) {
            rowsBySubmission.computeIfAbsent(row.getSubmission().getId(), id -> new ArrayList<>()).add(row);
        }

        Doc selfDoc = docOf(self);
        Chunks selfChunks = Chunks.of(selfRows, model, objectMapper);
        List<Scored> scored = new ArrayList<>();
        for (Submission other : pool) {
            Chunks otherChunks = Chunks.of(rowsBySubmission.getOrDefault(other.getId(), List.of()), model, objectMapper);
            scored.add(score(selfDoc, selfChunks, docOf(other), otherChunks, model));
        }
        // Chỉ đưa cho model chat những hồ sơ có điểm truy xuất đủ gần ngưỡng (AI có thể chấm cao hơn)
        int floor = Math.max(0, threshold - 20);
        List<Scored> top = scored.stream()
                .filter(item -> item.score() >= floor)
                .sorted(Comparator.comparingInt(Scored::score).reversed())
                .limit(topK)
                .toList();
        return new Analysis(selfDoc, top, model);
    }

    /**
     * Lập (hoặc lập lại) chỉ mục của 1 hồ sơ. Đã có chỉ mục đúng model và đúng nội dung thì giữ nguyên.
     *
     * @return các dòng submission_embeddings của hồ sơ sau khi lập
     */
    List<SubmissionEmbedding> index(Submission submission, String model) {
        List<String> texts = new ArrayList<>();
        texts.add(submission.getTitle() == null ? "" : submission.getTitle());
        texts.addAll(contentChunks(submission));

        List<SubmissionEmbedding> existing = embeddingRepository.findBySubmissionOrderByChunkTypeAscChunkIndexAsc(submission);
        if (upToDate(existing, texts, model)) {
            return existing;
        }
        embeddingRepository.deleteBySubmission(submission);
        embeddingRepository.flush();

        TextEmbeddingService.Embeddings embeddings = textEmbeddingService.embed(texts);
        List<SubmissionEmbedding> rows = new ArrayList<>();
        for (int i = 0; i < texts.size(); i++) {
            rows.add(SubmissionEmbedding.builder()
                    .submission(submission)
                    .chunkType(i == 0 ? ChunkType.TITLE : ChunkType.CONTENT)
                    .chunkIndex(i == 0 ? 0 : i - 1)
                    .chunkText(texts.get(i))
                    .embedding(objectMapper.writeValueAsString(embeddings.vectors().get(i)))
                    .model(embeddings.model())
                    .build());
        }
        return embeddingRepository.saveAll(rows);
    }

    private static boolean upToDate(List<SubmissionEmbedding> existing, List<String> texts, String model) {
        List<String> storedTexts = existing.stream()
                .filter(row -> model.equals(row.getModel()))
                .map(SubmissionEmbedding::getChunkText)
                .toList();
        // TITLE xếp trước CONTENT (thứ tự enum) nên danh sách đoạn chữ so được theo thứ tự
        return existing.size() == storedTexts.size() && storedTexts.equals(texts);
    }

    /** Tóm tắt + nội dung, cắt theo câu thành các đoạn ≤ CHUNK_MAX_CHARS ký tự, tối đa MAX_CONTENT_CHUNKS đoạn. */
    static List<String> contentChunks(Submission submission) {
        String text = String.join("\n",
                submission.getSummary() == null ? "" : submission.getSummary(),
                submission.getContent() == null ? "" : submission.getContent()).trim();
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String sentence : text.split("(?<=[.!?…])\\s+|\\n+")) {
            String trimmed = sentence.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if (current.length() > 0 && current.length() + trimmed.length() + 1 > CHUNK_MAX_CHARS) {
                chunks.add(current.toString());
                current.setLength(0);
            }
            if (current.length() > 0) {
                current.append(' ');
            }
            current.append(trimmed.length() > CHUNK_MAX_CHARS ? trimmed.substring(0, CHUNK_MAX_CHARS) : trimmed);
        }
        if (current.length() > 0) {
            chunks.add(current.toString());
        }
        return chunks.size() > MAX_CONTENT_CHUNKS ? chunks.subList(0, MAX_CONTENT_CHUNKS) : chunks;
    }

    /** Các đoạn đã lưu của 1 hồ sơ, tách theo loại; vector đọc từ JSON. */
    record Chunks(float[] title, List<float[]> contents) {

        static Chunks of(List<SubmissionEmbedding> rows, String model, ObjectMapper mapper) {
            float[] title = null;
            List<float[]> contents = new ArrayList<>();
            for (SubmissionEmbedding row : rows) {
                if (model.equals(row.getModel()) && row.getEmbedding() != null) {
                    float[] vector = mapper.readValue(row.getEmbedding(), float[].class);
                    if (row.getChunkType() == ChunkType.TITLE) {
                        title = vector;
                    } else {
                        contents.add(vector);
                    }
                }
            }
            return new Chunks(title, contents);
        }
    }

    Scored score(Doc self, Chunks selfChunks, Doc other, Chunks otherChunks, String model) {
        // Nội dung: trung bình, với mỗi đoạn của hồ sơ đang xét, độ giống của đoạn gần nhất bên kia
        double contentCosine = 0;
        if (!selfChunks.contents().isEmpty() && !otherChunks.contents().isEmpty()) {
            double sum = 0;
            for (float[] mine : selfChunks.contents()) {
                double best = 0;
                for (float[] theirs : otherChunks.contents()) {
                    best = Math.max(best, TextEmbeddingService.cosine(mine, theirs));
                }
                sum += best;
            }
            contentCosine = sum / selfChunks.contents().size();
        }
        int content = toPercent(model, contentCosine);
        int title = toPercent(model, TextEmbeddingService.cosine(selfChunks.title(), otherChunks.title()));

        boolean sameProvince = self.province() != null && other.province() != null
                && self.province().trim().equalsIgnoreCase(other.province().trim());
        long minutesApart = self.when() == null || other.when() == null
                ? Long.MAX_VALUE
                : Math.abs(Duration.between(self.when(), other.when()).toMinutes());

        double score = 0.75 * content + 0.15 * title
                + (sameProvince ? 5 : 0)
                + (minutesApart <= 120 ? 5 : minutesApart <= 24 * 60 ? 3 : 0);
        return new Scored(other, content, title, sameProvince, minutesApart == Long.MAX_VALUE ? -1 : minutesApart,
                (int) Math.min(100, Math.round(score)),
                commonPhrases(self.fullText(), other.fullText()));
    }

    /**
     * Đổi cosine thành %. Vector dự phòng: 2 đoạn không chung từ nào có cosine ~0 nên lấy thẳng.
     * Vector của model AI: 2 đoạn tiếng Việt không liên quan vẫn có cosine ~0.6, nên 0.6 -> 0% và 0.95 -> 100%.
     */
    static int toPercent(String model, double cosine) {
        double value = TextEmbeddingService.LOCAL_MODEL.equals(model) ? cosine : (cosine - 0.6) / 0.35;
        return (int) Math.round(Math.max(0, Math.min(1, value)) * 100);
    }

    private static Doc docOf(Submission submission) {
        LocalDateTime when = submission.getIncidentAt() != null ? submission.getIncidentAt() : submission.getCreatedAt();
        return new Doc(submission.getId(), submission.getTrackingCode(), submission.getTitle(), submission.getSummary(),
                submission.getContent(), submission.getProvince(), submission.getAddress(), when);
    }

    // ============================ CỤM TỪ GIỐNG NHAU ============================

    /** Độ dài cụm từ (số từ) được tìm, dài trước. */
    private static final int PHRASE_MAX_WORDS = 8;
    private static final int PHRASE_MIN_WORDS = 3;
    private static final int MAX_PHRASES = 6;

    /**
     * Các cụm 3–8 từ xuất hiện NGUYÊN VĂN (không phân biệt hoa thường) ở cả 2 văn bản, dài trước, tối đa 6 cụm.
     * Frontend tô vàng các cụm này ở cả 2 cột so sánh.
     */
    static List<String> commonPhrases(String a, String b) {
        List<String> tokensA = tokens(a);
        List<String> tokensB = tokens(b);
        Set<String> gramsB = new HashSet<>();
        for (int n = PHRASE_MIN_WORDS; n <= PHRASE_MAX_WORDS; n++) {
            for (int i = 0; i + n <= tokensB.size(); i++) {
                gramsB.add(lower(String.join(" ", tokensB.subList(i, i + n))));
            }
        }
        String lowerA = lower(a);
        String lowerB = lower(b);
        List<String> phrases = new ArrayList<>();
        int i = 0;
        while (i < tokensA.size()) {
            int matched = 0;
            for (int n = Math.min(PHRASE_MAX_WORDS, tokensA.size() - i); n >= PHRASE_MIN_WORDS; n--) {
                String phrase = String.join(" ", tokensA.subList(i, i + n));
                String key = lower(phrase);
                if (gramsB.contains(key) && lowerA.contains(key) && lowerB.contains(key)) {
                    if (!phrases.stream().map(DuplicateDetectionService::lower).toList().contains(key)) {
                        phrases.add(phrase);
                    }
                    matched = n;
                    break;
                }
            }
            i += matched > 0 ? matched : 1;
        }
        return phrases.stream()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .limit(MAX_PHRASES)
                .toList();
    }

    /** Tách theo khoảng trắng, bỏ dấu câu ở hai đầu mỗi từ. */
    private static List<String> tokens(String text) {
        List<String> tokens = new ArrayList<>();
        if (text == null) {
            return tokens;
        }
        for (String raw : text.split("\\s+")) {
            String token = raw.replaceAll("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$", "");
            if (!token.isEmpty()) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private static String lower(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT);
    }

    // ============================ BƯỚC 4: GHÉP KẾT QUẢ ============================

    private StoredResult buildResult(Analysis analysis, DuplicateJudgeService.Judgement judgement) {
        List<StoredCandidate> candidates = new ArrayList<>();
        for (Scored item : analysis.candidates()) {
            DuplicateJudgeService.Verdict verdict = judgement == null ? null : judgement.verdicts().get(item.doc().trackingCode());
            int similarity = verdict == null ? item.score() : verdict.similarity();
            if (similarity < threshold) {
                continue;
            }
            List<String> phrases = verdict == null || verdict.matchedPhrases().isEmpty()
                    ? item.matchedPhrases()
                    : verdict.matchedPhrases();
            String reason = verdict != null && verdict.reason() != null ? verdict.reason() : heuristicReason(item);
            candidates.add(new StoredCandidate(item.doc().id(), item.doc().trackingCode(), similarity,
                    item.contentSimilarity(), item.sameProvince(), item.minutesApart(), phrases, reason));
        }
        candidates.sort(Comparator.comparingInt(StoredCandidate::similarity).reversed());

        return new StoredResult(analysis.textModel(), judgement == null ? "heuristic" : "ai",
                judgement == null ? null : judgement.summary(),
                threshold, windowDays, candidates);
    }

    /** Lý do khi không có model chat: liệt kê các tín hiệu khớp. */
    static String heuristicReason(Scored item) {
        List<String> parts = new ArrayList<>();
        parts.add("nội dung giống " + item.contentSimilarity() + "%");
        if (item.sameProvince()) {
            parts.add("cùng tỉnh/thành");
        }
        if (item.minutesApart() >= 0 && item.minutesApart() <= 24 * 60) {
            parts.add("xảy ra cách nhau dưới 1 ngày");
        }
        return "Hệ thống so khớp tự động: " + String.join(", ", parts) + ".";
    }

}
