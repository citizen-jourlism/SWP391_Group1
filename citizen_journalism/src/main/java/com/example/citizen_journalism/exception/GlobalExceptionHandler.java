package com.example.citizen_journalism.exception;

import com.example.citizen_journalism.dto.ApiResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * "Lưới an toàn" bắt MỌI lỗi xảy ra trong controller/service và trả về cùng định dạng ApiResponse.
 *
 * TẠI SAO? Nếu không có lớp này, khi lỗi Spring sẽ trả về trang lỗi mặc định (tiếng Anh, khó đọc)
 * và frontend không biết lỗi thuộc ô nhập nào. Với lớp này:
 *   - Người dùng luôn thấy thông báo tiếng Việt dễ hiểu.
 *   - Không bao giờ lộ chi tiết kỹ thuật (stack trace) ra ngoài; chi tiết chỉ ghi vào log.
 *
 * @RestControllerAdvice: áp dụng cho tất cả controller trong dự án.
 * Mỗi @ExceptionHandler xử lý một loại lỗi; Spring tự chọn handler khớp nhất.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Lỗi nghiệp vụ mình tự ném (AppException) -> trả đúng mã HTTP, thông báo, mã lỗi và lỗi theo ô (nếu có). */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
        return ResponseEntity.status(ex.getStatus()).body(ApiResponse.error(ex.getMessage(), ex.getCode(), ex.getErrors()));
    }

    /**
     * Lỗi từ @Valid (dữ liệu sai so với các annotation @NotBlank, @Email... trong DTO).
     * Gom thành map { tênTrường: thôngBáo } để frontend hiện lỗi ngay dưới từng ô nhập.
     * putIfAbsent: mỗi trường chỉ giữ 1 lỗi đầu tiên cho gọn.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        return build(HttpStatus.BAD_REQUEST, "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.", errors);
    }

    /**
     * File tải lên vượt giới hạn chung của server (spring.servlet.multipart.max-file-size trong application.properties).
     * Lỗi này xảy ra TRƯỚC khi vào service, nên phải bắt riêng ở đây. Giới hạn chi tiết theo từng loại file
     * (ví dụ avatar 2MB) do FileStorageService kiểm tra.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleTooLarge(MaxUploadSizeExceededException ex) {
        return build(HttpStatus.CONTENT_TOO_LARGE, "File tải lên quá lớn.", null);
    }

    /**
     * Tham số trên đường dẫn sai kiểu, ví dụ ?status=ABC trong khi chỉ nhận PENDING, REJECTED...
     * (không bắt riêng thì sẽ rơi xuống handleUnexpected và thành lỗi 500).
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return build(HttpStatus.BAD_REQUEST, "Tham số '" + ex.getName() + "' không hợp lệ.", null);
    }

    /** Body gửi lên không phải JSON hợp lệ (ví dụ thiếu dấu ngoặc). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException ex) {
        return build(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không đúng định dạng.", null);
    }

    /** Mọi lỗi còn lại (không lường trước). */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        // Lỗi có sẵn mã HTTP của Spring (404 sai đường dẫn, 405 sai phương thức...) thì giữ nguyên mã đó,
        // không biến thành 500 "lỗi hệ thống".
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatus status = HttpStatus.valueOf(errorResponse.getStatusCode().value());
            String message = status == HttpStatus.NOT_FOUND
                    ? "Không tìm thấy đường dẫn yêu cầu."
                    : "Yêu cầu không hợp lệ (" + status.getReasonPhrase() + ").";
            return build(status, message, null);
        }
        // Lỗi thật sự ngoài dự kiến (bug): ghi đầy đủ vào log để lập trình viên sửa, người dùng chỉ thấy thông báo chung.
        log.error("Unexpected error", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Hệ thống đang gặp sự cố, vui lòng thử lại sau.", null);
    }

    /** Hàm phụ dùng chung để tạo phản hồi lỗi (tránh lặp code ở từng handler). */
    private ResponseEntity<ApiResponse<Void>> build(HttpStatus status, String message, Map<String, String> errors) {
        return ResponseEntity.status(status).body(ApiResponse.error(message, null, errors));
    }
}
