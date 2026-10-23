package com.example.citizen_journalism.dto.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Dữ liệu chữ khi LƯU NHÁP hoặc NỘP bài nghiên cứu (phần "data" của request multipart; ảnh MỚI ở phần "files").
 *
 * Annotation ở đây chỉ chặn độ dài tối đa (áp dụng cả khi lưu nháp). Các điều kiện bắt buộc lúc NỘP
 * (tiêu đề đủ dài, tối thiểu số chữ, có tài liệu tham khảo...) kiểm tra trong ResearchArticleService.validateForSubmit,
 * vì bản nháp được phép còn dở dang.
 *
 * @param action      DRAFT = lưu nháp; SUBMIT = nộp cho toà soạn
 * @param images      danh sách ảnh THEO THỨ TỰ trong bài. Ảnh đã lưu trước đó: có url; ảnh mới chọn: url = null
 *                    và tệp tương ứng nằm trong phần "files" (theo đúng thứ tự xuất hiện).
 * @param declaration tick cam kết tác quyền / trích dẫn (bắt buộc khi nộp)
 */
public record SaveResearchRequest(
        @NotNull(message = "Thiếu thao tác (lưu nháp hay nộp bài).")
        Action action,

        @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự.")
        String title,

        @Size(max = 1500, message = "Tóm tắt tối đa 1500 ký tự.")
        String abstractText,

        String field,

        @Size(max = 255, message = "Từ khoá tối đa 255 ký tự.")
        String keywords,

        @Size(max = 100_000, message = "Nội dung quá dài (tối đa 100.000 ký tự).")
        String content,

        @Size(max = 5000, message = "Tài liệu tham khảo tối đa 5000 ký tự.")
        String references,

        Boolean hasConflict,

        @Size(max = 1000, message = "Phần mô tả xung đột lợi ích tối đa 1000 ký tự.")
        String conflictNote,

        @Valid
        List<ImageItem> images,

        // Boolean (không phải boolean): lúc lưu nháp frontend có thể không gửi ô này; Jackson 3 báo lỗi nếu kiểu nguyên thuỷ bị thiếu
        Boolean declaration
) {

    public enum Action {
        DRAFT,
        SUBMIT
    }

    /** Một ảnh trong bài: url (null nếu là ảnh mới) + chú thích. */
    public record ImageItem(
            String url,
            @Size(max = 300, message = "Chú thích ảnh tối đa 300 ký tự.") String caption) {
    }
}
