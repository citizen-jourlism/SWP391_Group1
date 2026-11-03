package com.example.citizen_journalism.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import com.google.genai.Client;
import com.google.genai.types.ContentEmbedding;
import com.google.genai.types.EmbedContentConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * TẠO VECTOR (EMBEDDING) CHO ĐOẠN CHỮ — dùng cho Kiểm tra tin trùng (DuplicateDetectionService).
 *
 * Ưu tiên model embedding của Google Gemini, gọi qua Client của Google GenAI mà Spring AI đã tạo sẵn cho chat
 * (dùng chung khoá spring.ai.google.genai.api-key, không cần thêm thư viện hay cấu hình). Model đổi được bằng
 * app.duplicate.embedding-model. Không có khoá / gọi lỗi thì dùng vector dự phòng "local-hash-v1"
 * tính ngay trong Java (băm từ và cặp từ), để chức năng vẫn chạy khi máy không có mạng hoặc chưa cấu hình AI.
 * Gọi AI lỗi thì nghỉ 10 phút mới thử lại, để mỗi lần quét không phải chờ hết thời gian chờ.
 *
 * Vector của 2 model khác nhau không so được với nhau: mỗi kết quả kèm tên model, DuplicateDetectionService chỉ so
 * các đoạn cùng model và tạo lại vector cho hồ sơ cũ khi model đổi.
 */
@Slf4j
@Service
public class TextEmbeddingService {

    public static final String LOCAL_MODEL = "local-hash-v1";

    /** Số chiều của vector dự phòng. */
    static final int LOCAL_DIMENSIONS = 1024;

    private static final Duration RETRY_AFTER = Duration.ofMinutes(10);

    /** Số chiều vector của model AI (gemini-embedding-001 cho phép rút gọn, 768 là đủ cho so khớp). */
    static final int REMOTE_DIMENSIONS = 768;

    private final ObjectProvider<Client> clients;
    private final boolean aiEnabled;
    private final String remoteModel;
    private volatile Instant remoteBlockedUntil = Instant.MIN;

    public TextEmbeddingService(ObjectProvider<Client> clients,
                                @Value("${app.duplicate.use-ai:true}") boolean aiEnabled,
                                @Value("${app.duplicate.embedding-model:gemini-embedding-001}") String remoteModel) {
        this.clients = clients;
        this.aiEnabled = aiEnabled;
        this.remoteModel = remoteModel;
    }

    /** Kết quả: tên model + 1 vector (đã chuẩn hoá độ dài = 1) cho mỗi đoạn, cùng thứ tự với đầu vào. */
    public record Embeddings(String model, List<float[]> vectors) {
    }

    public Embeddings embed(List<String> texts) {
        if (texts.isEmpty()) {
            return new Embeddings(currentModel(), List.of());
        }
        Client client = remoteClient();
        if (client != null) {
            try {
                List<float[]> vectors = remoteEmbed(client, texts);
                if (vectors.size() == texts.size()) {
                    return new Embeddings(remoteLabel(), vectors);
                }
                log.warn("Model embedding trả về {} vector cho {} đoạn, dùng vector dự phòng.", vectors.size(), texts.size());
            } catch (RuntimeException ex) {
                log.warn("Không gọi được model embedding ({}), dùng vector dự phòng trong {} phút.",
                        ex.getMessage(), RETRY_AFTER.toMinutes());
            }
            remoteBlockedUntil = Instant.now().plus(RETRY_AFTER);
        }
        return new Embeddings(LOCAL_MODEL, texts.stream().map(TextEmbeddingService::localEmbedding).toList());
    }

    /** Model sẽ dùng nếu gọi lúc này (để biết hồ sơ nào cần tạo lại vector). */
    public String currentModel() {
        return remoteClient() != null ? remoteLabel() : LOCAL_MODEL;
    }

    /** Tên lưu ở cột model: tên model + số chiều, ví dụ "gemini-embedding-001@768". */
    private String remoteLabel() {
        return remoteModel + "@" + REMOTE_DIMENSIONS;
    }

    private Client remoteClient() {
        if (!aiEnabled || Instant.now().isBefore(remoteBlockedUntil)) {
            return null;
        }
        return clients.getIfAvailable();
    }

    private List<float[]> remoteEmbed(Client client, List<String> texts) {
        EmbedContentConfig config = EmbedContentConfig.builder()
                .taskType("SEMANTIC_SIMILARITY")
                .outputDimensionality(REMOTE_DIMENSIONS)
                .build();
        List<float[]> vectors = new ArrayList<>();
        for (ContentEmbedding embedding : client.models.embedContent(remoteModel, texts, config).embeddings().orElse(List.of())) {
            List<Float> values = embedding.values().orElse(List.of());
            float[] vector = new float[values.size()];
            for (int i = 0; i < vector.length; i++) {
                vector[i] = values.get(i);
            }
            vectors.add(normalize(vector));
        }
        return vectors;
    }

    // ============================ VECTOR DỰ PHÒNG ============================

    /**
     * Băm từ (tiếng Việt: mỗi âm tiết là 1 từ) và cặp 2 từ liền nhau vào LOCAL_DIMENSIONS ô, trọng số log(1 + số lần),
     * rồi chuẩn hoá. Hai đoạn càng nhiều từ / cụm từ chung thì cosine càng gần 1, không liên quan thì gần 0.
     */
    static float[] localEmbedding(String text) {
        List<String> words = words(text);
        Map<Integer, Integer> counts = new HashMap<>();
        for (int i = 0; i < words.size(); i++) {
            counts.merge(bucket(words.get(i)), 1, Integer::sum);
            if (i + 1 < words.size()) {
                counts.merge(bucket(words.get(i) + " " + words.get(i + 1)), 1, Integer::sum);
            }
        }
        float[] vector = new float[LOCAL_DIMENSIONS];
        counts.forEach((index, count) -> vector[index] += (float) (1 + Math.log(count)));
        return normalize(vector);
    }

    /** Tách chữ thường thành các từ (chỉ chữ và số), bỏ từ 1 ký tự. */
    static List<String> words(String text) {
        List<String> words = new ArrayList<>();
        if (text == null) {
            return words;
        }
        for (String word : text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (word.length() > 1) {
                words.add(word);
            }
        }
        return words;
    }

    private static int bucket(String token) {
        return Math.floorMod(token.hashCode(), LOCAL_DIMENSIONS);
    }

    static float[] normalize(float[] vector) {
        double sum = 0;
        for (float value : vector) {
            sum += value * value;
        }
        if (sum == 0) {
            return vector;
        }
        float[] result = Arrays.copyOf(vector, vector.length);
        float length = (float) Math.sqrt(sum);
        for (int i = 0; i < result.length; i++) {
            result[i] /= length;
        }
        return result;
    }

    /** Cosine của 2 vector đã chuẩn hoá = tích vô hướng. Khác số chiều (khác model) thì coi như không giống. */
    public static double cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) {
            return 0;
        }
        double dot = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
        }
        return dot;
    }
}
