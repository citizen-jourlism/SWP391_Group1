package com.example.citizen_journalism.service;

import com.example.citizen_journalism.exception.AppException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lưu file người dùng tải lên vào THƯ MỤC TRÊN MÁY (mặc định: citizen_journalism/uploads/).
 * Dùng chung cho: ảnh đại diện (đang dùng), tư liệu/bằng chứng khi gửi khiếu nại (sau này).
 *
 * File được truy cập lại qua đường dẫn web "/uploads/..." (xem config/WebConfig.java).
 * Thư mục uploads/ đã được .gitignore bỏ qua -> ảnh của người dùng không bị đẩy lên GitHub.
 *
 * AN TOÀN:
 *   - Chỉ nhận đúng loại file cho phép (theo Content-Type) và giới hạn dung lượng.
 *   - KHÔNG dùng tên file người dùng gửi lên (có thể chứa "../" để ghi đè file hệ thống);
 *     tự đặt tên mới = tiền tố + chuỗi ngẫu nhiên + đuôi file chuẩn.
 *   - Khi xoá, kiểm tra đường dẫn phải nằm TRONG thư mục uploads.
 */
@Slf4j
@Service
public class FileStorageService {

    /** Đường dẫn web tương ứng với thư mục gốc uploads. */
    public static final String URL_PREFIX = "/uploads/";

    /** Các loại ẢNH cho phép và đuôi file tương ứng. */
    public static final Map<String, String> IMAGE_TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final Path root;

    public FileStorageService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        // toAbsolutePath: đường dẫn tuyệt đối tính từ thư mục chạy backend (citizen_journalism/)
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Lưu một file và trả về đường dẫn web để lưu vào DB, ví dụ "/uploads/avatars/CT0001-1a2b3c4d.png".
     *
     * @param file         file người dùng gửi lên (multipart)
     * @param folder       thư mục con, ví dụ "avatars"
     * @param namePrefix   tiền tố tên file, ví dụ mã người dùng "CT0001" (để dễ nhận biết khi xem thư mục)
     * @param allowedTypes các Content-Type cho phép -> đuôi file (ví dụ IMAGE_TYPES)
     * @param maxBytes     dung lượng tối đa (byte)
     */
    public String store(MultipartFile file, String folder, String namePrefix,
                        Map<String, String> allowedTypes, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("Vui lòng chọn file.");
        }
        String extension = allowedTypes.get(file.getContentType());
        if (extension == null) {
            throw AppException.badRequest("Định dạng file không được hỗ trợ.");
        }
        if (file.getSize() > maxBytes) {
            throw AppException.badRequest("File vượt quá dung lượng cho phép (tối đa " + (maxBytes / 1024 / 1024) + "MB).");
        }

        String fileName = namePrefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + extension;
        Path directory = root.resolve(folder);
        try (InputStream input = file.getInputStream()) {
            Files.createDirectories(directory); // Tạo thư mục nếu chưa có
            Files.copy(input, directory.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            log.error("Cannot store file {}", fileName, ex);
            throw AppException.badRequest("Không lưu được file, vui lòng thử lại.");
        }
        return URL_PREFIX + folder + "/" + fileName;
    }

    /** Xoá file theo đường dẫn web đã lưu trong DB (bỏ qua nếu null hoặc không nằm trong uploads). */
    public void delete(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) {
            return;
        }
        Path target = root.resolve(url.substring(URL_PREFIX.length())).normalize();
        if (!target.startsWith(root)) {
            return; // Chặn đường dẫn kiểu "../" trỏ ra ngoài thư mục uploads
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ex) {
            log.warn("Cannot delete file {}", target, ex); // Xoá file cũ thất bại không ảnh hưởng người dùng
        }
    }

    /** Thư mục gốc (dùng trong WebConfig để phục vụ file qua đường dẫn /uploads/**). */
    public Path getRoot() {
        return root;
    }
}
