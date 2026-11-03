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
import java.time.Instant;
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
 *   1. ĐỌC DỮ LIỆU (transaction ngắn, chỉ đọc): hồ sơ đang xét, các hồ sơ trong cửa sổ windowDays ngày, các đoạn chữ
 *      của từng hồ sơ (tiêu đề, nội dung) và vector đã lưu ở bảng submission_embeddings.
 *   2. TẠO VECTOR CÒN THIẾU (ngoài transaction): hồ sơ chưa có vector, vector cũ của nội dung đã sửa, hoặc vector tạo
 *      bằng model khác thì tạo lại, GOM CHUNG nhiều hồ sơ vào ít lần gọi AI (TextEmbeddingService chia lô).
 *      Cả lần quét luôn dùng MỘT model: AI lỗi thì cả lần quét chuyển sang vector dự phòng, vì vector khác model
 *      không so được với nhau. Chỉ so chữ: ảnh, audio, video không xét (nhóm quyết định 2026-11-03).
 *   3. LƯU VECTOR MỚI (transaction ngắn). Mỗi hồ sơ giữ vector của từng model riêng, nên khi AI lỗi rồi chạy lại
 *      không phải tạo lại toàn bộ.
 *   4. TRUY XUẤT (Retrieval): so vector từng đoạn nội dung, cộng thêm tín hiệu tiêu đề, cùng tỉnh/thành, thời gian
 *      xảy ra -> chọn tối đa topK hồ sơ giống nhất.
 *   5. SINH KẾT LUẬN (Augmented Generation): gửi hồ sơ mới + các hồ sơ vừa truy xuất cho model chat
 *      (DuplicateJudgeService) chấm % trùng, nêu lý do và các cụm từ giống nhau. Không gọi được AI thì dùng điểm ở bước 4.
 *   6. GHI KẾT QUẢ: 1 dòng submission_events (actor SYSTEM, description bắt đầu CHECK_MARKER, note = JSON StoredResult,
 *      kèm "dấu vân tay" nội dung lúc quét); tóm tắt AI (nếu có) ghi vào submissions.ai_summary.
 *      Không thêm cột / bảng nào khác (quyết định của nhóm 2026-11-03). Dòng mới nhất là kết quả hiện tại.
 *
 * TẠI SAO gọi AI ngoài transaction? Lần quét đầu có thể phải tạo vector cho vài trăm hồ sơ; giữ transaction mở suốt
 * thời gian chờ mạng sẽ giữ kết nối DB và khoá các dòng đang ghi rất lâu.
 *
 * Các dòng nhật ký có mã "[DUPLICATE_" là dữ liệu NỘI BỘ: SubmissionTrackingService bỏ chúng khỏi nhật ký người gửi xem.
 * Quét chạy trên luồng riêng (requestCheck), màn hình hiện "đang quét" cho tới khi có kết quả. Chỉ 1 luồng quét:
 * 2 lần quét chạy song song sẽ cùng lập chỉ mục cho các hồ sơ cũ chung cửa sổ, gây deadlock / trùng dòng trong DB.
 * Quét lỗi thì nghỉ FAILURE_COOLDOWN mới cho quét lại hồ sơ đó, để màn hình tự tải lại không kích hoạt quét liên tục.
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
    /** Quét lỗi thì chờ từng này mới quét lại cùng hồ sơ. */
    static final Duration FAILURE_COOLDOWN = Duration.ofMinutes(2);

    private final SubmissionRepository submissionRepository;
    private final SubmissionEmbeddingRepository embeddingRepository;
    private final SubmissionEventRepository eventRepository;
    private final TextEmbeddingService textEmbeddingService;
    private final DuplicateJudgeService judgeService;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactions;
    private final TransactionTemplate readOnlyTransactions;

    private final int threshold;
    private final int windowDays;
    private final int topK;

    /** Hồ sơ đang quét (id), để không chạy 2 lần quét cùng lúc cho 1 hồ sơ. */
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    /** Lần quét lỗi gần nhất của từng hồ sơ (id -> thời điểm), xem FAILURE_COOLDOWN. */
    private final Map<Long, Instant> failedAt = new ConcurrentHashMap<>();
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
        this.readOnlyTransactions = new TransactionTemplate(transactionManager);
        this.readOnlyTransactions.setReadOnly(true);
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
     * @param fingerprint      dấu vân tay nội dung hồ sơ lúc quét (xem fingerprint); khác hiện tại = kết quả đã cũ
     */
    @JsonIgnoreProperties(ignoreUnknown = true) // kết quả cũ còn spamScore / credibilityScore (đã bỏ 2026-11-03)
    public record StoredResult(String textModel, String judgeModel, String summary, int threshold, int windowDays,
                               String fingerprint, List<StoredCandidate> candidates) {
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

    /**
     * Dấu vân tay của phần chữ đem so (tiêu đề + các đoạn nội dung). Người gửi bổ sung hay Biên tập viên sửa nội dung
     * đều làm đổi dấu vân tay, nên DuplicateReviewService biết kết quả cũ đã lỗi thời mà không cần dò nhật ký.
     */
    public static String fingerprint(Submission submission) {
        return Integer.toHexString(String.join("\n", textsOf(submission)).hashCode());
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

    /** Lần quét gần nhất của hồ sơ bị lỗi và chưa hết thời gian chờ. */
    public boolean failedRecently(Long submissionId) {
        Instant at = failedAt.get(submissionId);
        return at != null && Instant.now().isBefore(at.plus(FAILURE_COOLDOWN));
    }

    /** Xếp lịch quét trên luồng nền; đang quét, hoặc vừa quét lỗi, thì bỏ qua. */
    public void requestCheck(Long submissionId) {
        if (failedRecently(submissionId) || !running.add(submissionId)) {
            return;
        }
        executor.submit(() -> {
            try {
                runCheck(submissionId);
                failedAt.remove(submissionId);
            } catch (RuntimeException ex) {
                failedAt.put(submissionId, Instant.now());
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
        Snapshot snapshot = readOnlyTransactions.execute(status -> snapshot(submissionId));
        if (snapshot == null) {
            return null;
        }
        Indexed indexed = vectorsFor(snapshot);
        if (!indexed.fresh().isEmpty()) {
            transactions.executeWithoutResult(status -> saveVectors(indexed));
        }
        Analysis analysis = analyse(snapshot, indexed);
        DuplicateJudgeService.Judgement judgement = judgeService.judge(analysis.self(), analysis.candidates());
        StoredResult result = buildResult(analysis, judgement, snapshot.self().fingerprint());
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

    // ============================ BƯỚC 1: ĐỌC DỮ LIỆU ============================

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

    /** 1 vector đã lưu ở submission_embeddings (dạng thô, đọc ra ngoài transaction). */
    record StoredVector(ChunkType chunkType, int chunkIndex, String text, String json) {
    }

    /**
     * 1 hồ sơ đem so: dữ liệu để chấm điểm, các đoạn chữ hiện tại (đoạn 0 = tiêu đề), vector đã lưu theo từng model.
     */
    record Entry(Doc doc, List<String> texts, String fingerprint, Map<String, List<StoredVector>> stored) {
    }

    /** Hồ sơ đang xét và các hồ sơ trong cửa sổ so sánh. */
    record Snapshot(Entry self, List<Entry> pool) {

        List<Entry> all() {
            List<Entry> all = new ArrayList<>(pool.size() + 1);
            all.add(self);
            all.addAll(pool);
            return all;
        }
    }

    private Snapshot snapshot(Long submissionId) {
        Submission self = submissionRepository.findById(submissionId).orElse(null);
        if (self == null) {
            return null;
        }
        LocalDateTime base = self.getCreatedAt() == null ? LocalDateTime.now() : self.getCreatedAt();
        List<Submission> pool = submissionRepository.findDuplicateCheckPool(
                self.getId(), base.minusDays(windowDays), PageRequest.of(0, MAX_POOL));

        List<Long> ids = new ArrayList<>(pool.size() + 1);
        ids.add(self.getId());
        pool.forEach(other -> ids.add(other.getId()));
        // Vector đã lưu của cả cửa sổ trong 1 câu SQL, chia theo hồ sơ rồi theo model
        Map<Long, Map<String, List<StoredVector>>> stored = new HashMap<>();
        for (SubmissionEmbedding row : embeddingRepository.findBySubmissionIds(ids)) {
            stored.computeIfAbsent(row.getSubmission().getId(), id -> new HashMap<>())
                    .computeIfAbsent(row.getModel(), model -> new ArrayList<>())
                    .add(new StoredVector(row.getChunkType(), row.getChunkIndex(), row.getChunkText(), row.getEmbedding()));
        }

        List<Entry> entries = new ArrayList<>(pool.size());
        for (Submission other : pool) {
            entries.add(entryOf(other, stored));
        }
        return new Snapshot(entryOf(self, stored), entries);
    }

    private static Entry entryOf(Submission submission, Map<Long, Map<String, List<StoredVector>>> stored) {
        return new Entry(docOf(submission), textsOf(submission), fingerprint(submission),
                stored.getOrDefault(submission.getId(), Map.of()));
    }

    /** Các đoạn chữ đem so của 1 hồ sơ: đoạn 0 là tiêu đề, sau đó là các đoạn nội dung. */
    static List<String> textsOf(Submission submission) {
        List<String> texts = new ArrayList<>();
        texts.add(submission.getTitle() == null ? "" : submission.getTitle());
        texts.addAll(contentChunks(submission));
        return texts;
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

    // ============================ BƯỚC 2 + 3: TẠO VÀ LƯU VECTOR ============================

    /**
     * Vector của mọi hồ sơ trong lần quét, cùng 1 model.
     *
     * @param vectors vector theo id hồ sơ, cùng thứ tự với Entry.texts
     * @param fresh   các hồ sơ vừa tạo vector mới, cần lưu
     */
    record Indexed(String model, Map<Long, List<float[]>> vectors, List<Entry> fresh) {
    }

    /** Dùng lại vector đã lưu nếu còn đúng; phần còn thiếu tạo trong 1 lần gọi (TextEmbeddingService tự chia lô). */
    private Indexed vectorsFor(Snapshot snapshot) {
        List<Entry> entries = snapshot.all();
        String model = textEmbeddingService.currentModel();
        Map<Long, List<float[]>> vectors = new HashMap<>();
        List<Entry> missing = collectCached(entries, model, vectors);

        if (!missing.isEmpty() && !TextEmbeddingService.LOCAL_MODEL.equals(model)) {
            List<String> texts = missing.stream().flatMap(entry -> entry.texts().stream()).toList();
            TextEmbeddingService.Embeddings embeddings = textEmbeddingService.embed(texts);
            if (model.equals(embeddings.model())) {
                splitInto(missing, embeddings.vectors(), vectors);
                return new Indexed(model, vectors, missing);
            }
            // AI lỗi: cả lần quét dùng vector dự phòng để mọi hồ sơ được so cùng 1 loại vector
            log.warn("Không tạo được vector bằng {}, lần quét này dùng {}.", model, TextEmbeddingService.LOCAL_MODEL);
            model = TextEmbeddingService.LOCAL_MODEL;
            vectors.clear();
            missing = collectCached(entries, model, vectors);
        }
        // Vector dự phòng tính ngay trong Java, không gọi mạng
        for (Entry entry : missing) {
            vectors.put(entry.doc().id(), entry.texts().stream().map(TextEmbeddingService::localEmbedding).toList());
        }
        return new Indexed(model, vectors, missing);
    }

    /** Đưa vector đã lưu còn đúng vào `vectors`; trả về các hồ sơ phải tạo lại. */
    private List<Entry> collectCached(List<Entry> entries, String model, Map<Long, List<float[]>> vectors) {
        List<Entry> missing = new ArrayList<>();
        for (Entry entry : entries) {
            List<float[]> cached = cachedVectors(entry, model);
            if (cached == null) {
                missing.add(entry);
            } else {
                vectors.put(entry.doc().id(), cached);
            }
        }
        return missing;
    }

    /**
     * Vector đã lưu của 1 hồ sơ theo model, chỉ khi các đoạn chữ lúc tạo vector giống hệt các đoạn hiện tại.
     * Không có, đã cũ, hoặc đọc không được thì trả về null (tạo lại).
     */
    private List<float[]> cachedVectors(Entry entry, String model) {
        List<StoredVector> rows = new ArrayList<>(entry.stored().getOrDefault(model, List.of()));
        if (rows.size() != entry.texts().size()) {
            return null;
        }
        // Tiêu đề trước, rồi các đoạn nội dung theo thứ tự, để so với Entry.texts
        rows.sort(Comparator.comparing((StoredVector row) -> row.chunkType() == ChunkType.TITLE ? 0 : 1)
                .thenComparingInt(StoredVector::chunkIndex));
        List<float[]> result = new ArrayList<>(rows.size());
        for (int i = 0; i < rows.size(); i++) {
            StoredVector row = rows.get(i);
            if (!entry.texts().get(i).equals(row.text()) || row.json() == null) {
                return null;
            }
            try {
                result.add(objectMapper.readValue(row.json(), float[].class));
            } catch (RuntimeException ex) {
                return null;
            }
        }
        return result;
    }

    /** Chia danh sách vector phẳng trở lại cho từng hồ sơ, theo đúng thứ tự đã ghép. */
    private static void splitInto(List<Entry> entries, List<float[]> flat, Map<Long, List<float[]>> vectors) {
        int offset = 0;
        for (Entry entry : entries) {
            int size = entry.texts().size();
            vectors.put(entry.doc().id(), List.copyOf(flat.subList(offset, offset + size)));
            offset += size;
        }
    }

    /** Thay vector cũ (cùng model) của các hồ sơ vừa tạo; vector của model khác giữ nguyên để lần sau dùng lại. */
    private void saveVectors(Indexed indexed) {
        List<SubmissionEmbedding> rows = new ArrayList<>();
        for (Entry entry : indexed.fresh()) {
            Long id = entry.doc().id();
            embeddingRepository.deleteBySubmissionIdAndModel(id, indexed.model());
            Submission submission = submissionRepository.getReferenceById(id);
            List<float[]> vectors = indexed.vectors().get(id);
            for (int i = 0; i < entry.texts().size(); i++) {
                rows.add(SubmissionEmbedding.builder()
                        .submission(submission)
                        .chunkType(i == 0 ? ChunkType.TITLE : ChunkType.CONTENT)
                        .chunkIndex(i == 0 ? 0 : i - 1)
                        .chunkText(entry.texts().get(i))
                        .embedding(objectMapper.writeValueAsString(vectors.get(i)))
                        .model(indexed.model())
                        .build());
            }
        }
        embeddingRepository.saveAll(rows);
    }

    // ============================ BƯỚC 4: TRUY XUẤT ============================

    /** Hồ sơ đang xét và các hồ sơ truy xuất được (đã chấm điểm, giống nhất trước). */
    record Analysis(Doc self, List<Scored> candidates, String textModel) {
    }

    /** 1 hồ sơ truy xuất được và các tín hiệu so với hồ sơ đang xét. */
    record Scored(Doc doc, int contentSimilarity, int titleSimilarity, boolean sameProvince, long minutesApart,
                  int score, List<String> matchedPhrases) {
    }

    /** Vector của 1 hồ sơ, tách tiêu đề và nội dung. */
    record Chunks(float[] title, List<float[]> contents) {

        static Chunks of(List<float[]> vectors) {
            if (vectors == null || vectors.isEmpty()) {
                return new Chunks(null, List.of());
            }
            return new Chunks(vectors.get(0), vectors.subList(1, vectors.size()));
        }
    }

    private Analysis analyse(Snapshot snapshot, Indexed indexed) {
        Doc selfDoc = snapshot.self().doc();
        Chunks selfChunks = Chunks.of(indexed.vectors().get(selfDoc.id()));
        List<Scored> scored = new ArrayList<>();
        for (Entry other : snapshot.pool()) {
            scored.add(score(selfDoc, selfChunks, other.doc(), Chunks.of(indexed.vectors().get(other.doc().id())),
                    indexed.model()));
        }
        // Chỉ đưa cho model chat những hồ sơ có điểm truy xuất đủ gần ngưỡng (AI có thể chấm cao hơn)
        int floor = Math.max(0, threshold - 20);
        List<Scored> top = scored.stream()
                .filter(item -> item.score() >= floor)
                .sorted(Comparator.comparingInt(Scored::score).reversed())
                .limit(topK)
                .toList();
        return new Analysis(selfDoc, top, indexed.model());
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

    // ============================ BƯỚC 6: GHÉP KẾT QUẢ ============================

    private StoredResult buildResult(Analysis analysis, DuplicateJudgeService.Judgement judgement, String fingerprint) {
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
                threshold, windowDays, fingerprint, candidates);
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
