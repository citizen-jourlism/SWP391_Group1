
package com.example.citizen_journalism.service;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.UserRepository;

import tools.jackson.databind.json.JsonMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

/**
 * TungTT - Iteration 3 - Task 3.
 *
 * Citizen đăng ký nâng cấp thành Expert.
 *
 * Luồng xử lý:
 * Citizen -> Editor -> Deputy EIC -> Expert.
 *
 * Lưu đơn bằng file JSON.
 * Không tạo bảng hoặc thay đổi cấu trúc Database.
 */
@Service
public class ExpertUpgradeService {

    private final UserRepository users;
    private final FileStorageService files;
    private final JsonMapper mapper;
    private final Path root;

    public ExpertUpgradeService(
            UserRepository users,
            FileStorageService files,
            JsonMapper mapper,
            @Value("${app.upload.dir:uploads}") String uploadDir
    ) {
        this.users = users;
        this.files = files;
        this.mapper = mapper;

        this.root = Path.of(uploadDir)
                .toAbsolutePath()
                .normalize()
                .resolve("applications/expert");
    }

    // ==============================
    // TRẠNG THÁI ĐƠN
    // ==============================

    public enum Status {
        PENDING_EDITOR,
        PENDING_DEPUTY,
        APPROVED,
        REJECTED
    }

    // Thông tin file bằng cấp/chứng chỉ.
    public record ExpertDocument(
            String name,
            String url,
            String contentType,
            long size
    ) {}

    // Thông tin đơn đăng ký Expert.
    public record ExpertApplication(
            String id,
            String applicantId,
            String fullName,
            String email,
            String expertise,
            String qualification,
            String experience,
            List<ExpertDocument> documents,
            Status status,
            String editorId,
            String editorNote,
            LocalDateTime editorReviewedAt,
            String deputyId,
            String deputyNote,
            LocalDateTime deputyReviewedAt,
            LocalDateTime createdAt
    ) {}

    // Các loại file được phép gửi.
    private static final Map<String, String> TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "application/pdf", "pdf",
            "application/msword", "doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"
    );

    // Tối đa 10 MB cho mỗi file.
    private static final long MAX_FILE = 10L * 1024 * 1024;

    // ==============================
    // KIỂM TRA QUYỀN
    // ==============================

    private User requireRole(
            String userId,
            User.Role requiredRole
    ) {
        User user = users.getActiveById(userId);

        if (user.getRole() != requiredRole) {
            throw AppException.forbidden(
                    "Bạn không có quyền thực hiện thao tác này.",
                    "EXPERT_UPGRADE_ROLE_REQUIRED"
            );
        }

        return user;
    }

    // ==============================
    // XỬ LÝ ĐƯỜNG DẪN JSON
    // ==============================

    private Path path(String id) {
        try {
            UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw AppException.badRequest(
                    "Mã đơn không hợp lệ."
            );
        }

        return root.resolve(id + ".json");
    }

    // ==============================
    // ĐỌC FILE JSON
    // ==============================

    private ExpertApplication read(Path file) {
        try {
            String json = Files.readString(file);

            return mapper.readValue(
                    json,
                    ExpertApplication.class
            );

        } catch (Exception e) {
            throw AppException.badRequest(
                    "Không đọc được dữ liệu đơn Expert."
            );
        }
    }

    // ==============================
    // GHI FILE JSON
    // ==============================

    /**
     * Ghi JSON vào file tạm, sau đó
     * chuyển sang file chính.
     *
     * Giảm nguy cơ ghi file bị dở.
     */
    private void write(ExpertApplication application) {
        Path target = path(application.id());
        Path temp = null;

        try {
            Files.createDirectories(root);

            temp = Files.createTempFile(
                    root,
                    "expert-",
                    ".tmp"
            );

            // Jackson 3: chuyển object thành chuỗi JSON.
            String json = mapper.writeValueAsString(
                    application
            );

            Files.writeString(temp, json);

            try {
                Files.move(
                        temp,
                        target,
                        StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE
                );

            } catch (AtomicMoveNotSupportedException e) {
                Files.move(
                        temp,
                        target,
                        StandardCopyOption.REPLACE_EXISTING
                );
            }

        } catch (Exception e) {
            throw AppException.badRequest(
                    "Không lưu được đơn Expert. Vui lòng thử lại."
            );

        } finally {
            if (temp != null) {
                try {
                    Files.deleteIfExists(temp);
                } catch (IOException ignored) {
                    // Không làm gián đoạn xử lý chính.
                }
            }
        }
    }

    // ==============================
    // LẤY TẤT CẢ ĐƠN EXPERT
    // ==============================

    private List<ExpertApplication> all() {
        if (!Files.isDirectory(root)) {
            return List.of();
        }

        try (Stream<Path> stream = Files.list(root)) {

            return stream
                    .filter(p ->
                            p.getFileName()
                                    .toString()
                                    .endsWith(".json")
                    )
                    .map(this::read)
                    .sorted(
                            Comparator.comparing(
                                    ExpertApplication::createdAt
                            ).reversed()
                    )
                    .toList();

        } catch (IOException e) {
            throw AppException.badRequest(
                    "Không đọc được danh sách đơn Expert."
            );
        }
    }

    // ==============================
    // CITIZEN GỬI ĐƠN EXPERT
    // ==============================

    /**
     * Chỉ Citizen được đăng ký.
     *
     * Mỗi Citizen chỉ có một đơn Expert
     * đang chờ xét duyệt tại một thời điểm.
     */
    public synchronized ExpertApplication apply(
            String citizenId,
            String expertise,
            String qualification,
            String experience,
            List<MultipartFile> documents
    ) {
        User citizen = requireRole(
                citizenId,
                User.Role.CITIZEN
        );

        // Kiểm tra thông tin bắt buộc.
        if (expertise == null || expertise.isBlank()
                || qualification == null
                || qualification.isBlank()) {

            throw AppException.badRequest(
                    "Vui lòng nhập lĩnh vực chuyên môn và bằng cấp."
            );
        }

        // Giới hạn số ký tự.
        if (expertise.length() > 150
                || qualification.length() > 200
                || (experience != null
                    && experience.length() > 1000)) {

            throw AppException.badRequest(
                    "Nội dung đăng ký quá dài."
            );
        }

        // Kiểm tra Citizen có đơn đang chờ hay không.
        boolean pending = all().stream().anyMatch(a ->
                a.applicantId().equals(citizenId)
                && (
                        a.status() == Status.PENDING_EDITOR
                        || a.status() == Status.PENDING_DEPUTY
                )
        );

        if (pending) {
            throw AppException.conflict(
                    "Bạn đã có đơn Expert đang được xét duyệt."
            );
        }

        // Phải có ít nhất 1 file, tối đa 5 file.
        if (documents == null
                || documents.isEmpty()
                || documents.size() > 5) {

            throw AppException.badRequest(
                    "Vui lòng tải lên từ 1 đến 5 bằng cấp/chứng chỉ."
            );
        }

        // Kiểm tra định dạng và dung lượng.
        for (MultipartFile document : documents) {
            files.validate(
                    document,
                    TYPES,
                    MAX_FILE
            );
        }

        String id = UUID.randomUUID().toString();

        List<ExpertDocument> saved =
                new ArrayList<>();

        try {
            // Lưu từng file bằng cấp/chứng chỉ.
            for (MultipartFile document : documents) {

                String url = files.store(
                        document,
                        "applications/expert",
                        id,
                        TYPES,
                        MAX_FILE
                );

                saved.add(
                        new ExpertDocument(
                                FileStorageService.originalName(
                                        document,
                                        "tai-lieu"
                                ),
                                url,
                                document.getContentType(),
                                document.getSize()
                        )
                );
            }

            // Tạo đơn chờ Editor duyệt.
            ExpertApplication application =
                    new ExpertApplication(
                            id,
                            citizenId,
                            citizen.getFullName(),
                            citizen.getEmail(),
                            expertise.trim(),
                            qualification.trim(),
                            experience == null
                                    ? ""
                                    : experience.trim(),
                            List.copyOf(saved),
                            Status.PENDING_EDITOR,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            LocalDateTime.now()
                    );

            write(application);

            return application;

        } catch (RuntimeException e) {

            // Nếu lưu đơn thất bại,
            // xóa những tài liệu vừa tạo.
            for (ExpertDocument document : saved) {
                try {
                    files.delete(document.url());
                } catch (RuntimeException ignored) {
                    // Giữ lại lỗi gốc.
                }
            }

            throw e;
        }
    }

    // ==============================
    // CITIZEN XEM ĐƠN CỦA MÌNH
    // ==============================

    public List<ExpertApplication> mine(
            String citizenId
    ) {
        User user = users.getActiveById(citizenId);

        if (user.getRole() != User.Role.CITIZEN
                && user.getRole() != User.Role.EXPERT) {

            throw AppException.forbidden(
                    "Không có quyền xem đơn Expert.",
                    "EXPERT_UPGRADE_ROLE_REQUIRED"
            );
        }

        return all()
                .stream()
                .filter(a ->
                        a.applicantId().equals(citizenId)
                )
                .toList();
    }

    // ==============================
    // EDITOR / DEPUTY XEM DANH SÁCH
    // ==============================

    public List<ExpertApplication> queue(
            String reviewerId,
            User.Role role
    ) {
        if (role != User.Role.EDITOR
                && role != User.Role.DEPUTY_EIC) {
            throw AppException.forbidden(
                    "Vai trò xét duyệt không hợp lệ.",
                    "EXPERT_REVIEW_ROLE_INVALID"
            );
        }

        requireRole(reviewerId, role);

        Status target = role == User.Role.EDITOR
                ? Status.PENDING_EDITOR
                : Status.PENDING_DEPUTY;

        return all()
                .stream()
                .filter(a -> a.status() == target)
                .toList();
    }

    // ==============================
    // XEM CHI TIẾT ĐƠN
    // ==============================

    public ExpertApplication getForReviewer(
            String reviewerId,
            User.Role role,
            String id
    ) {
        if (role != User.Role.EDITOR
                && role != User.Role.DEPUTY_EIC) {
            throw AppException.forbidden(
                    "Vai trò xét duyệt không hợp lệ.",
                    "EXPERT_REVIEW_ROLE_INVALID"
            );
        }

        requireRole(reviewerId, role);

        Path file = path(id);

        if (!Files.isRegularFile(file)) {
            throw AppException.notFound(
                    "Không tìm thấy đơn Expert."
            );
        }

        return read(file);
    }

    // ==============================
    // EDITOR XÉT DUYỆT BƯỚC 1
    // ==============================

    /**
     * Editor:
     * - Approve: chuyển sang Deputy EIC.
     * - Reject: từ chối, ghi lý do.
     */
    public synchronized ExpertApplication editorReview(
            String editorId,
            String id,
            boolean approved,
            String note
    ) {
        requireRole(
                editorId,
                User.Role.EDITOR
        );

        ExpertApplication a = getForReviewer(
                editorId,
                User.Role.EDITOR,
                id
        );

        if (a.status() != Status.PENDING_EDITOR) {
            throw AppException.conflict(
                    "Đơn không còn ở bước Editor xét duyệt."
            );
        }

        // Nếu từ chối phải có lý do.
        if (!approved
                && (note == null || note.isBlank())) {

            throw AppException.badRequest(
                    "Phải nhập lý do từ chối."
            );
        }

        ExpertApplication updated =
                new ExpertApplication(
                        a.id(),
                        a.applicantId(),
                        a.fullName(),
                        a.email(),
                        a.expertise(),
                        a.qualification(),
                        a.experience(),
                        a.documents(),
                        approved
                                ? Status.PENDING_DEPUTY
                                : Status.REJECTED,
                        editorId,
                        note,
                        LocalDateTime.now(),
                        null,
                        null,
                        null,
                        a.createdAt()
                );

        write(updated);

        return updated;
    }

    // ==============================
    // DEPUTY EIC XÉT DUYỆT CUỐI
    // ==============================

    /**
     * Deputy EIC:
     * - Approve: chuyển CITIZEN -> EXPERT.
     * - Reject: giữ vai trò CITIZEN.
     */
    public synchronized ExpertApplication deputyReview(
            String deputyId,
            String id,
            boolean approved,
            String note
    ) {
        requireRole(
                deputyId,
                User.Role.DEPUTY_EIC
        );

        ExpertApplication a = getForReviewer(
                deputyId,
                User.Role.DEPUTY_EIC,
                id
        );

        if (a.status() != Status.PENDING_DEPUTY) {
            throw AppException.conflict(
                    "Đơn không còn ở bước Deputy xét duyệt."
            );
        }

        // Nếu từ chối, bắt buộc ghi lý do.
        if (!approved
                && (note == null || note.isBlank())) {

            throw AppException.badRequest(
                    "Phải nhập lý do từ chối."
            );
        }

        // Kiểm tra tài khoản của người đăng ký.
        User applicant = users.getActiveById(
                a.applicantId()
        );

        if (applicant.getRole()
                != User.Role.CITIZEN) {

            throw AppException.conflict(
                    "Vai trò của người đăng ký đã thay đổi."
            );
        }

        ExpertApplication updated =
                new ExpertApplication(
                        a.id(),
                        a.applicantId(),
                        a.fullName(),
                        a.email(),
                        a.expertise(),
                        a.qualification(),
                        a.experience(),
                        a.documents(),
                        approved
                                ? Status.APPROVED
                                : Status.REJECTED,
                        a.editorId(),
                        a.editorNote(),
                        a.editorReviewedAt(),
                        deputyId,
                        note,
                        LocalDateTime.now(),
                        a.createdAt()
                );

        // Chỉ đổi role khi Deputy phê duyệt cuối.
        if (approved) {
            applicant.setRole(User.Role.EXPERT);
            users.save(applicant);
        }

        // Lưu kết quả xét duyệt vào JSON.
        write(updated);

        return updated;
    }

    // ==============================
    // XEM / TẢI TÀI LIỆU ĐƠN EXPERT
    // ==============================

    /**
     * Chỉ cho phép:
     * - Chủ đơn.
     * - Editor.
     * - Deputy EIC.
     *
     * Tài liệu không được mở công khai.
     */
    public Resource document(
            String userId,
            String applicationId,
            int index
    ) {
        User viewer = users.getActiveById(userId);

        Path file = path(applicationId);

        if (!Files.isRegularFile(file)) {
            throw AppException.notFound(
                    "Không tìm thấy đơn."
            );
        }

        ExpertApplication a = read(file);

        boolean owner =
                a.applicantId().equals(userId);

        boolean reviewer =
                viewer.getRole() == User.Role.EDITOR
                || viewer.getRole() == User.Role.DEPUTY_EIC;

        if (!owner && !reviewer) {
            throw AppException.forbidden(
                    "Không có quyền xem tài liệu.",
                    "EXPERT_DOCUMENT_FORBIDDEN"
            );
        }

        if (index < 0
                || index >= a.documents().size()) {

            throw AppException.notFound(
                    "Không tìm thấy tài liệu."
            );
        }

        return files.load(
                a.documents().get(index).url()
        );
    }
}
