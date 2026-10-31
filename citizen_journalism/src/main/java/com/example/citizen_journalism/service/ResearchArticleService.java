package com.example.citizen_journalism.service;

import static com.example.citizen_journalism.util.TextUtils.blankToNull;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.dto.research.ResearchArticleSummary;
import com.example.citizen_journalism.dto.research.ResearchArticleView;
import com.example.citizen_journalism.dto.research.ResearchOptions;
import com.example.citizen_journalism.dto.research.SaveResearchRequest;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.ResearchArticle.Status;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.util.ExpertiseFields;
import com.example.citizen_journalism.util.Paging;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * NGHIỆP VỤ BÀI NGHIÊN CỨU + QUẢN LÝ BẢN NHÁP của Chuyên gia (ResearchController, frontend /research/...).
 *
 *   - create / update : LƯU NHÁP (action DRAFT) hoặc NỘP (action SUBMIT). Cùng 1 hàm save() cho cả 2,
 *                       khác nhau ở bước kiểm tra: nháp chỉ cần có chút nội dung, nộp thì phải đủ điều kiện.
 *   - list / get      : danh sách bản nháp / bài đã nộp hoặc duyệt, mở lại để viết tiếp hoặc xem.
 *   - delete          : xoá bản nháp (kèm xoá ảnh trên ổ đĩa).
 * Chỉ tác giả thao tác được trên bài của mình; bài đã nộp thì khoá, không sửa / xoá.
 *
 * ẢNH MINH HOẠ: frontend gửi danh sách ảnh theo thứ tự trong bài. Ảnh đã lưu trước đó giữ nguyên url,
 * ảnh mới gửi kèm tệp. Ảnh nào không còn trong danh sách (người dùng đã xoá) thì xoá luôn tệp trên ổ đĩa.
 */
@Service
@RequiredArgsConstructor
public class ResearchArticleService {

    // ----- Điều kiện khi NỘP bài (frontend đọc qua getOptions để hiện bảng kiểm tra) -----
    public static final int MIN_TITLE_LENGTH = 10;
    public static final int MIN_ABSTRACT_LENGTH = 100;
    public static final int MIN_WORDS = 300;
    public static final int MAX_IMAGES = 8;
    public static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

    private static final String IMAGE_FOLDER = "research";
    private static final int EXCERPT_LENGTH = 180;

    private final ResearchArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    /** Một ảnh lưu trong cột images (JSON). */
    private record StoredImage(String url, String name, long size, String caption) {
    }

    @Transactional(readOnly = true)
    public ResearchOptions getOptions(String userId) {
        return new ResearchOptions(
                ExpertiseFields.ALL,
                MIN_TITLE_LENGTH,
                MIN_ABSTRACT_LENGTH,
                MIN_WORDS,
                MAX_IMAGES,
                MAX_IMAGE_BYTES / 1024 / 1024,
                FileStorageService.IMAGE_TYPES.keySet().stream().sorted().toList(),
                articleRepository.countByAuthorIdAndStatus(userId, Status.DRAFT),
                articleRepository.countByAuthorIdAndStatus(userId, Status.SUBMITTED),
                articleRepository.countByAuthorIdAndStatus(userId, Status.APPROVED),
                articleRepository.countByAuthorIdAndStatus(userId, Status.REJECTED));
    }

    /** Danh sách bài theo trạng thái, bài sửa / nộp gần nhất lên đầu. */
    @Transactional(readOnly = true)
    public PageResponse<ResearchArticleSummary> list(String userId, Status status, int page, int size) {
        PageRequest pageable = Paging.of(page, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")));
        return PageResponse.from(articleRepository.findByAuthorIdAndStatus(userId, status, pageable).map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public ResearchArticleView get(String userId, Long id) {
        return toView(findOwned(userId, id));
    }

    /** Bài ĐÃ NỘP cho nhân viên toà soạn xem (không cần là tác giả). Bản nháp -> 404. */
    @Transactional(readOnly = true)
    public ResearchArticleView getSubmittedForStaff(Long id) {
        ResearchArticle article = articleRepository.findById(id)
                .filter(found -> found.getStatus() == Status.SUBMITTED)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy bài nghiên cứu."));
        return toView(article);
    }

    /** Bài mới: tạo bản ghi rồi lưu như 1 lần sửa. */
    @Transactional
    public ResearchArticleView create(String userId, SaveResearchRequest request, List<MultipartFile> files) {
        User author = userRepository.getActiveById(userId);
        ResearchArticle article = ResearchArticle.builder().author(author).status(Status.DRAFT).build();
        return save(article, request, files);
    }

    @Transactional
    public ResearchArticleView update(String userId, Long id, SaveResearchRequest request, List<MultipartFile> files) {
        userRepository.getActiveById(userId);
        return save(findEditable(userId, id), request, files);
    }

    @Transactional
    public void delete(String userId, Long id) {
        ResearchArticle article = findEditable(userId, id);
        imagesOf(article).forEach(image -> fileStorageService.delete(image.url()));
        articleRepository.delete(article);
    }

    // ================================ LƯU / NỘP ================================

    private ResearchArticleView save(ResearchArticle article, SaveResearchRequest request, List<MultipartFile> files) {
        boolean submit = request.action() == SaveResearchRequest.Action.SUBMIT;
        List<SaveResearchRequest.ImageItem> imageItems = request.images() == null ? List.of() : request.images();
        List<MultipartFile> newFiles = files == null ? List.of() : files;

        // 1. Kiểm tra
        validateCommon(request, imageItems, newFiles);
        if (submit) {
            validateForSubmit(request, imageItems.size());
        } else if (blankToNull(request.title()) == null && blankToNull(request.content()) == null) {
            throw AppException.badRequest("Bản nháp chưa có tiêu đề hay nội dung nào để lưu.");
        }

        // 2. Ghép danh sách ảnh mới: ảnh cũ giữ lại (phải đúng là ảnh của bài này) + ảnh mới lưu ra ổ đĩa
        Map<String, StoredImage> oldImages = imagesOf(article).stream()
                .collect(Collectors.toMap(StoredImage::url, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        List<StoredImage> images = new ArrayList<>();
        List<String> storedUrls = new ArrayList<>();
        Iterator<MultipartFile> fileIterator = newFiles.iterator();
        try {
            for (SaveResearchRequest.ImageItem item : imageItems) {
                String caption = blankToNull(item.caption());
                if (item.url() != null) {
                    StoredImage old = oldImages.get(item.url());
                    if (old == null) {
                        throw AppException.badRequest("Ảnh không thuộc bài viết này.");
                    }
                    images.add(new StoredImage(old.url(), old.name(), old.size(), caption));
                } else {
                    MultipartFile file = fileIterator.next();
                    // Tên tệp: "<mã tác giả>-<chuỗi ngẫu nhiên>.png" (bài mới chưa có id nên dùng mã tác giả)
                    String url = fileStorageService.store(file, IMAGE_FOLDER, article.getAuthor().getId(),
                            FileStorageService.IMAGE_TYPES, MAX_IMAGE_BYTES);
                    storedUrls.add(url);
                    images.add(new StoredImage(url, FileStorageService.originalName(file, "hinh-anh"), file.getSize(), caption));
                }
            }
        } catch (RuntimeException ex) {
            storedUrls.forEach(fileStorageService::delete); // Lỗi giữa chừng: dọn ảnh vừa lưu
            throw ex;
        }

        // 3. Ghi dữ liệu
        article.setTitle(blankToNull(request.title()));
        article.setAbstractText(blankToNull(request.abstractText()));
        article.setField(blankToNull(request.field()));
        article.setKeywords(blankToNull(request.keywords()));
        article.setContent(blankToNull(request.content()));
        article.setReferenceList(blankToNull(request.references()));
        article.setHasConflict(request.hasConflict());
        article.setConflictNote(Boolean.TRUE.equals(request.hasConflict()) ? blankToNull(request.conflictNote()) : null);
        article.setImages(objectMapper.writeValueAsString(images));
        if (submit) {
            article.setStatus(Status.SUBMITTED);
            article.setSubmittedAt(LocalDateTime.now());
        }
        ResearchArticle saved = articleRepository.save(article);

        // 4. Ảnh cũ không còn trong bài -> xoá tệp trên ổ đĩa
        Set<String> keptUrls = images.stream().map(StoredImage::url).collect(Collectors.toSet());
        oldImages.keySet().stream().filter(url -> !keptUrls.contains(url)).forEach(fileStorageService::delete);

        return toView(saved);
    }

    /** Kiểm tra áp dụng cho cả lưu nháp lẫn nộp: lĩnh vực hợp lệ, số lượng / định dạng ảnh. */
    private void validateCommon(SaveResearchRequest request, List<SaveResearchRequest.ImageItem> images,
                                List<MultipartFile> files) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (blankToNull(request.field()) != null && !ExpertiseFields.ALL.contains(request.field())) {
            errors.put("field", "Lĩnh vực không hợp lệ.");
        }
        long newCount = images.stream().filter(item -> item.url() == null).count();
        if (images.size() > MAX_IMAGES) {
            errors.put("images", "Tối đa " + MAX_IMAGES + " ảnh trong một bài.");
        } else if (newCount != files.size()) {
            errors.put("images", "Danh sách ảnh không khớp với tệp gửi lên, vui lòng thử lại.");
        } else {
            try {
                files.forEach(file -> fileStorageService.validate(file, FileStorageService.IMAGE_TYPES, MAX_IMAGE_BYTES));
            } catch (AppException ex) {
                errors.put("images", ex.getMessage());
            }
        }
        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }
    }

    /** Điều kiện để NỘP bài. Gom mọi lỗi theo ô để hiện cùng lúc. */
    private void validateForSubmit(SaveResearchRequest request, int imageCount) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (length(request.title()) < MIN_TITLE_LENGTH) {
            errors.put("title", "Tiêu đề tối thiểu " + MIN_TITLE_LENGTH + " ký tự.");
        }
        if (length(request.abstractText()) < MIN_ABSTRACT_LENGTH) {
            errors.put("abstractText", "Tóm tắt tối thiểu " + MIN_ABSTRACT_LENGTH + " ký tự.");
        }
        if (blankToNull(request.field()) == null) {
            errors.put("field", "Vui lòng chọn lĩnh vực.");
        }
        if (blankToNull(request.keywords()) == null) {
            errors.put("keywords", "Vui lòng nhập ít nhất 1 từ khoá.");
        }
        if (countWords(request.content()) < MIN_WORDS) {
            errors.put("content", "Nội dung tối thiểu " + MIN_WORDS + " chữ.");
        }
        if (imageCount == 0) {
            errors.put("images", "Vui lòng thêm ít nhất 1 hình ảnh minh hoạ / dẫn chứng.");
        }
        if (blankToNull(request.references()) == null) {
            errors.put("references", "Vui lòng ghi ít nhất 1 tài liệu tham khảo.");
        }
        if (request.hasConflict() == null) {
            errors.put("hasConflict", "Vui lòng khai báo xung đột lợi ích.");
        } else if (request.hasConflict() && length(request.conflictNote()) < 10) {
            errors.put("conflictNote", "Vui lòng mô tả xung đột lợi ích (ít nhất 10 ký tự).");
        }
        if (!Boolean.TRUE.equals(request.declaration())) {
            errors.put("declaration", "Bạn cần xác nhận cam kết trước khi nộp bài.");
        }
        if (!errors.isEmpty()) {
            throw AppException.invalidFields(errors);
        }
    }

    // ================================ HÀM PHỤ ================================

    private ResearchArticle findOwned(String userId, Long id) {
        return articleRepository.findByIdAndAuthorId(id, userId)
                .orElseThrow(() -> AppException.notFound("Không tìm thấy bài viết."));
    }

    /** Bài của mình VÀ còn là bản nháp (bài đã nộp thì không sửa / xoá). */
    private ResearchArticle findEditable(String userId, Long id) {
        ResearchArticle article = findOwned(userId, id);
        if (article.getStatus() != Status.DRAFT) {
            throw AppException.conflict("Bài đã nộp cho toà soạn, không thể sửa hoặc xoá.");
        }
        return article;
    }

    private List<StoredImage> imagesOf(ResearchArticle article) {
        if (article.getImages() == null) {
            return List.of();
        }
        return objectMapper.readValue(article.getImages(), new TypeReference<List<StoredImage>>() {
        });
    }

    /**
     * Đếm số chữ: tách theo khoảng trắng. Frontend đếm cùng cách (lib/research.js countWords)
     * để con số trên màn hình khớp với điều kiện nộp bài.
     */
    private static int countWords(String text) {
        String trimmed = text == null ? "" : text.trim();
        return trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;
    }

    private static int length(String text) {
        return text == null ? 0 : text.trim().length();
    }

    private ResearchArticleView toView(ResearchArticle article) {
        return new ResearchArticleView(
                article.getId(),
                article.getStatus(),
                article.getTitle(),
                article.getAbstractText(),
                article.getField(),
                article.getKeywords(),
                article.getContent(),
                article.getReferenceList(),
                article.getHasConflict(),
                article.getConflictNote(),
                imagesOf(article).stream()
                        .map(image -> new ResearchArticleView.Image(image.url(), image.name(), image.size(), image.caption()))
                        .toList(),
                countWords(article.getContent()),
                article.getCreatedAt(),
                article.getUpdatedAt(),
                article.getSubmittedAt());
    }

    private ResearchArticleSummary toSummary(ResearchArticle article) {
        String source = article.getAbstractText() != null ? article.getAbstractText() : article.getContent();
        String excerpt = source == null ? null
                : source.length() > EXCERPT_LENGTH ? source.substring(0, EXCERPT_LENGTH).trim() + "…" : source;
        return new ResearchArticleSummary(article.getId(), article.getStatus(), article.getTitle(), article.getField(),
                excerpt, countWords(article.getContent()), imagesOf(article).size(), article.getUpdatedAt(),
                article.getSubmittedAt());
    }
}
