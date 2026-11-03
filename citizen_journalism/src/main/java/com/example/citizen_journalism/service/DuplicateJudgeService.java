package com.example.citizen_journalism.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * BƯỚC "SINH KẾT LUẬN" CỦA RAG KIỂM TRA TIN TRÙNG — model chat (Gemini qua Spring AI ChatClient) đọc hồ sơ mới cùng
 * các hồ sơ đã truy xuất được (DuplicateDetectionService) rồi chấm % trùng, nêu lý do, chỉ ra cụm từ giống nhau,
 * kèm điểm nghi vấn tin rác, độ tin cậy và 1 câu tóm tắt cho màn hình.
 *
 * Không có model chat / gọi lỗi / trả về không đúng JSON thì trả về null: DuplicateDetectionService dùng điểm truy xuất.
 * Gọi lỗi thì nghỉ 10 phút mới thử lại. Cụm từ AI đưa ra phải xuất hiện nguyên văn ở cả 2 hồ sơ, nếu không thì bỏ.
 */
@Slf4j
@Service
public class DuplicateJudgeService {

    /** Số ký tự nội dung tối đa của mỗi hồ sơ gửi cho model (giới hạn chi phí). */
    static final int MAX_CONTENT_CHARS = 3000;
    private static final Duration RETRY_AFTER = Duration.ofMinutes(10);

    private static final String SYSTEM_PROMPT = """
            Bạn là trợ lý của bàn biên tập một toà soạn báo công dân. Nhiệm vụ: xác định hồ sơ MỚI có phản ánh CÙNG MỘT
            sự việc với các hồ sơ ĐÃ CÓ hay không (cùng sự kiện, cùng địa điểm, cùng thời gian), không chỉ cùng chủ đề.
            Chỉ trả về MỘT đối tượng JSON, không giải thích thêm, không dùng ```:
            {
              "summary": "1-2 câu tóm tắt hồ sơ mới, tiếng Việt",
              "candidates": [
                {
                  "code": "mã hồ sơ đã có",
                  "similarity": số 0-100 (khả năng cùng một sự việc),
                  "reason": "1-2 câu tiếng Việt nêu điểm giống / khác chính",
                  "matchedPhrases": ["cụm từ 3-8 chữ xuất hiện NGUYÊN VĂN ở cả hai hồ sơ", "..."]
                }
              ]
            }
            Phải có đủ một phần tử trong "candidates" cho mỗi hồ sơ đã có được cung cấp.""";

    private final ObjectProvider<ChatClient.Builder> chatClients;
    private final ObjectMapper objectMapper;
    private final boolean aiEnabled;
    private volatile Instant blockedUntil = Instant.MIN;

    public DuplicateJudgeService(ObjectProvider<ChatClient.Builder> chatClients, ObjectMapper objectMapper,
                                 @Value("${app.duplicate.use-ai:true}") boolean aiEnabled) {
        this.chatClients = chatClients;
        this.objectMapper = objectMapper;
        this.aiEnabled = aiEnabled;
    }

    /** Kết luận của model cho 1 hồ sơ đã có. */
    public record Verdict(int similarity, String reason, List<String> matchedPhrases) {
    }

    /** @param verdicts kết luận theo mã hồ sơ đã có */
    public record Judgement(String summary, Map<String, Verdict> verdicts) {
    }

    /** null khi không dùng được model chat. */
    public Judgement judge(DuplicateDetectionService.Doc self, List<DuplicateDetectionService.Scored> candidates) {
        if (!aiEnabled || Instant.now().isBefore(blockedUntil)) {
            return null;
        }
        ChatClient.Builder builder = chatClients.getIfAvailable();
        if (builder == null) {
            return null;
        }
        try {
            String answer = builder.build().prompt()
                    .system(SYSTEM_PROMPT)
                    .user(userPrompt(self, candidates))
                    .call()
                    .content();
            Judgement judgement = parse(answer, self, candidates);
            if (judgement == null) {
                log.warn("Model chat trả về kết quả không đọc được, dùng điểm truy xuất.");
            }
            return judgement;
        } catch (RuntimeException ex) {
            log.warn("Không gọi được model chat ({}), dùng điểm truy xuất trong {} phút.", ex.getMessage(),
                    RETRY_AFTER.toMinutes());
            blockedUntil = Instant.now().plus(RETRY_AFTER);
            return null;
        }
    }

    static String userPrompt(DuplicateDetectionService.Doc self, List<DuplicateDetectionService.Scored> candidates) {
        StringBuilder prompt = new StringBuilder("HỒ SƠ MỚI\n").append(describe(self));
        if (candidates.isEmpty()) {
            prompt.append("\n\nKhông có hồ sơ đã có nào gần giống, trả về \"candidates\": [].");
        }
        for (int i = 0; i < candidates.size(); i++) {
            DuplicateDetectionService.Scored item = candidates.get(i);
            prompt.append("\n\nHỒ SƠ ĐÃ CÓ ").append(i + 1)
                    .append(" (hệ thống đo nội dung giống ").append(item.contentSimilarity()).append("%")
                    .append(")\n").append(describe(item.doc()));
        }
        return prompt.toString();
    }

    private static String describe(DuplicateDetectionService.Doc doc) {
        String content = doc.content() == null ? "" : doc.content();
        if (content.length() > MAX_CONTENT_CHARS) {
            content = content.substring(0, MAX_CONTENT_CHARS) + "…";
        }
        return "Mã: " + doc.trackingCode()
                + "\nTiêu đề: " + (doc.title() == null ? "" : doc.title())
                + "\nThời điểm: " + (doc.when() == null ? "không rõ" : doc.when())
                + "\nĐịa điểm: " + String.join(", ", doc.address() == null ? "" : doc.address(),
                doc.province() == null ? "" : doc.province())
                + (doc.summary() == null ? "" : "\nTóm tắt: " + doc.summary())
                + "\nNội dung: " + content;
    }

    /** Đọc JSON model trả về; sai định dạng thì null. */
    Judgement parse(String answer, DuplicateDetectionService.Doc self, List<DuplicateDetectionService.Scored> candidates) {
        if (answer == null) {
            return null;
        }
        String json = answer.trim();
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(json.substring(start, end + 1));
        } catch (RuntimeException ex) {
            return null;
        }
        Map<String, DuplicateDetectionService.Doc> docsByCode = new HashMap<>();
        candidates.forEach(item -> docsByCode.put(item.doc().trackingCode().toUpperCase(Locale.ROOT), item.doc()));

        Map<String, Verdict> verdicts = new HashMap<>();
        for (JsonNode node : root.path("candidates")) {
            String code = node.path("code").asString("").trim().toUpperCase(Locale.ROOT);
            DuplicateDetectionService.Doc other = docsByCode.get(code);
            if (other == null || !node.path("similarity").isNumber()) {
                continue;
            }
            List<String> phrases = new ArrayList<>();
            for (JsonNode phrase : node.path("matchedPhrases")) {
                String text = phrase.asString("").trim();
                if (text.length() >= 3 && containsIgnoreCase(self.fullText(), text)
                        && containsIgnoreCase(other.fullText(), text) && phrases.size() < 6) {
                    phrases.add(text);
                }
            }
            String reason = node.path("reason").asString("").trim();
            verdicts.put(other.trackingCode(), new Verdict(clamp(node.path("similarity").asInt()),
                    reason.isEmpty() ? null : reason, phrases));
        }
        String summary = root.path("summary").asString("").trim();
        return new Judgement(
                summary.isEmpty() ? null : summary,
                verdicts);
    }

    private static boolean containsIgnoreCase(String text, String part) {
        return text != null && text.toLowerCase(Locale.ROOT).contains(part.toLowerCase(Locale.ROOT));
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }
}
