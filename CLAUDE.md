# CONTEXT – Tin Nóng Dân Sinh (SWP391 – Group 1)

## 1. Dự án là gì

"Tin Nóng Dân Sinh" là cổng **báo chí công dân**:
- Người dân gửi tin nóng / khiếu nại (có thể ẩn danh, kèm ảnh/video/tài liệu).
- Toà soạn (Biên tập viên → Phó Tổng biên tập → Tổng biên tập) xử lý, có thể điều Cộng tác viên đi xác minh.
- Chuyên gia viết bài nghiên cứu.
- Người gửi tra cứu tiến độ hồ sơ bằng **mã hồ sơ + mã PIN**.

**Vai trò (enum `User.Role`, mã người dùng có tiền tố theo vai trò):**

| Vai trò | Tiền tố mã | Ghi chú |
|---|---|---|
| CITIZEN (Người dân) | CT | Đăng ký công khai luôn ra vai trò này |
| CONTRIBUTOR (Cộng tác viên – CTV) | CB | Người dân nâng cấp qua đơn đăng ký |
| EXPERT (Chuyên gia / researcher) | EX | Viết bài nghiên cứu |
| EDITOR (Biên tập viên – BTV) | ED | |
| DEPUTY_EIC (Phó Tổng biên tập) | DE | Chưa có màn hình |
| EIC (Tổng biên tập) | EC | Chưa có màn hình |
| SYSTEM_ADMIN | AD | Chỉ có **1** tài khoản, tự tạo khi khởi động |

Tài liệu SRS/SDS của nhóm chỉ để **tham khảo**: nhiều chỗ còn là mẫu của môn học hoặc chưa chính xác. Hãy làm đúng việc được giao, giữ trong phạm vi một đồ án SWP391 và không làm quá đà (không S3 thật, không eKYC…).

---

## 2. Công nghệ & cấu trúc thư mục

```
SWP391_Group1/
├─ CLAUDE.md                ← file này
├─ docs/
    ├── srs/
        ├── srs.md              ← SRS
        ├── diagrams/           ← file chứa các diagram
    └── sds/
        ├── sds.md              ← SDS
        ├── diagrams/           ← file chứa các diagram
    └── project_tracking.md     ← file chứa các use case, screens, functions cần làm
├─ .vscode/tasks.json        ← Ctrl+Shift+B chạy cả backend + frontend
└─ citizen_journalism/
   ├─ pom.xml, mvnw          ← Backend Spring Boot
   ├─ .env.example           ← mẫu cấu hình bí mật (copy thành .env)
   ├─ src/main/java/…/       ← config, controller, service, repository, entity, dto, exception, security, util
   ├─ uploads/                ← file người dùng tải lên (git bỏ qua)
   └─ frontend/src/           ← React SPA: routes, components, services, hooks, lib, context, assets/styles
```

### Backend
- **Spring Boot 4.1.1, Java 17.** Không dùng được `Math.clamp`, phải tự viết `Math.min(Math.max(...))`.
- **Spring Security 7:** chạy dạng *OAuth2 resource server*, token JWT HS256 tự ký (`JwtService`, `JwtConfig`). Trong controller, `userId` lấy bằng `@AuthenticationPrincipal Jwt jwt` → `jwt.getSubject()`.
- **JPA / Hibernate 7, MySQL 8.** Đang để `ddl-auto=update`, tức là bảng tự tạo/cập nhật theo entity.
- **Jackson 3** (`tools.jackson.databind.ObjectMapper`, `tools.jackson.core.type.TypeReference`).
- **Lombok.**
- **Mail:** Gmail SMTP. Khi `MAIL_ENABLED=false` thì email (kể cả mã OTP) chỉ in ra console với nhãn `[DEV MAIL]`.

### Frontend
- React 19, React Router 7, axios, Vite 8. Viết **JavaScript (JSX)**, không phải TypeScript.
- Không dùng Tailwind: CSS thuần với design tokens (biến màu, khoảng cách…) khai báo trong `index.css`.
- Lint bằng **oxlint**: `npm run lint`. Build: `npm run build` (nhớ xoá `dist/` sau khi build thử).
- Vite proxy chuyển `/api` và `/uploads` sang backend (`vite.config.js`). Đổi backend bằng biến `API_TARGET`.

---

## 3. Chạy dự án trên máy

1. Copy `.env.example` thành `.env` (trong `citizen_journalism/`), điền `ADMIN_PASSWORD`, `ADMIN_EMAIL`. **Không bao giờ commit `.env`.**
2. Backend: `./mvnw spring-boot:run` (port 8080). Frontend: `npm run dev` trong `frontend/` (port 5173). Lint: `npm run lint`.
3. Lần chạy đầu, backend tự tạo tài khoản **Admin** (`AD0001`). Tạo BTV/Chuyên gia qua trang quản trị.
4. Lỗi `NoClassDefFoundError` → `./mvnw clean` rồi chạy lại.

**Khi thêm entity hoặc cột mới, phải khởi động lại backend** để Hibernate cập nhật bảng.

---

## 4. Tiến độ dự án
- Truy cập `docs/progress.md` để biết chi tiết.
- Sau khi hoàn thiện hãy update tiến độ trong `docs/progress.md`.

---

## 5. Luồng code & quy ước (QUAN TRỌNG – giữ y như vậy khi thêm tính năng)

### 5.1 Luồng một request
```
Trang (routes/X.jsx) → hook useForm / useAsyncData → services/xService.js → lib/api.js (axios, tự gắn token)
  → Vite proxy → Controller (@RestController, /api/...) → Service (@Transactional, xử lý chính)
  → Repository (JPA) → MySQL
```

### 5.2 Backend
- **Phản hồi luôn có dạng** `ApiResponse<T>(success, message, code, data, errors)`. Controller trả về `ApiResponse.ok("Thông báo tiếng Việt", data)`.
- **Báo lỗi bằng `AppException`:** `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooManyRequests`, `invalidFields(Map)`.
  - `GlobalExceptionHandler` đổi mọi lỗi thành `ApiResponse` kèm HTTP status.
  - `invalidFields(Map<tên ô, thông báo>)` gom **tất cả** lỗi theo từng ô để frontend hiện lỗi ngay dưới từng ô.
- **Validate:** dùng annotation trên DTO record (`@NotBlank`, `@Pattern(ValidationRules...)`, `@StrongPassword`), thông báo viết tiếng Việt. Những kiểm tra annotation không làm được thì làm trong service và ném `invalidFields`.
- **Phân quyền:** khai trong `SecurityConfig` bằng `.requestMatchers("/api/xxx/**").hasRole(...)`. Thêm API mới thì thêm dòng **trước** `/api/**`. Đường dẫn công khai nằm ở `PUBLIC_ENDPOINTS`.
- **`userRepository.getActiveById(userId)`:** dùng ở đầu mọi service cần người dùng đang đăng nhập. Tài khoản đã bị khoá thì ném 401 → frontend tự đăng xuất.
- **`@Transactional(noRollbackFor = AppException.class)`:** dùng cho những chỗ đếm số lần nhập sai (OTP, mật khẩu, PIN). Nếu không có dòng này, khi ném lỗi Spring sẽ huỷ luôn việc tăng biến đếm.
- **Không cần gọi `save()`** khi sửa entity đang được JPA quản lý trong transaction (*dirty checking* tự ghi xuống DB).
- **Upload:** request dạng multipart gồm `@RequestPart("data")` (JSON) + `@RequestPart("files")`.
  - Lưu tệp qua `FileStorageService.validate/store/delete/load` với các nhóm định dạng `EVIDENCE_TYPES`, `DOCUMENT_TYPES`, `IMAGE_TYPES`.
  - Lỗi giữa chừng thì phải tự xoá các tệp đã ghi (DB đã tự rollback).
  - Giấy tờ CTV (`/uploads/applications/**`) bị `denyAll`. Chỉ trả qua API có kiểm tra quyền (`FileResponses.inline`); phía frontend mở bằng `lib/files.openProtectedFile`.
- **Mật khẩu, mã OTP, mã PIN đều lưu dạng băm BCrypt** (`PasswordEncoder`), không bao giờ lưu bản gốc.
- **Mã người dùng** do `UserIdGenerator.next(role)` sinh, ví dụ `CT0001`, `ED0001`. Mã giữ nguyên kể cả khi đổi vai trò.

### 5.3 Bẫy kỹ thuật đã gặp
- **Hibernate `ddl-auto=update` không cập nhật cột ENUM của MySQL** khi thêm giá trị mới vào enum Java.
  - Cột enum **mới** thì khai báo `@Column(columnDefinition = "VARCHAR(30)")` để sau này thêm giá trị không phải sửa DB.
  - Cột ENUM **cũ** cần thêm giá trị thì phải sửa cột bằng SQL (báo cả nhóm chạy trên máy mình). **Không** tạo bảng mới để né bẫy này (xem mục 5.6).
- **Jackson 3:** trường kiểu nguyên thuỷ (`boolean`) bị thiếu trong JSON gửi lên multipart có thể gây lỗi. Trong DTO nên dùng `Boolean`.
- **`references` là từ khoá của MySQL.** Vì vậy cột được đặt tên là `reference_list`.
- **Git** trên Windows đang để `autocrlf=true`, nên sẽ có cảnh báo LF/CRLF; không ảnh hưởng gì.

### 5.4 Frontend
- **Thêm trang:** tạo file trong `routes/`, rồi thêm `<Route>` trong `App.jsx`.
  - Trang cần đăng nhập thì bọc `<ProtectedRoute roles={[...]}>`.
  - Khu admin và editor là route lồng nhau trong `AdminLayout` / `EditorLayout`. Hai layout này dùng chung `ConsoleLayout`.
- **Form:** dùng `useForm` + `validators` (`rules.required`, `rules.pattern`, `rules.when`, `rules.notFuture`…). Lỗi theo từng ô từ backend (`errors`) được tự gắn vào đúng ô.
- **Tải dữ liệu:** dùng `useAsyncData(load, key)`, trả về `{ data, error, loading, reload, setData }`.
- **Gọi API chỉ qua `services/*.js`** (dùng `lib/api.js`). `api.js` trả thẳng `{ success, message, data }`; khi lỗi luôn reject `{ status, message, code, errors }`.
- **Vai trò & trang chủ theo vai trò:** khai trong `lib/roles.js` (`SUBMITTER_ROLES`, `HOME_PATHS`).
  - Admin và Editor có giao diện console riêng, **không** có link về khu người dùng.
- **Dùng lại component trong `components/ui`**, đừng viết lại: Button, TextField, SelectField, ChipSelect, Modal, ConfirmDialog, Alert, Badge, OtpInput / OtpPanel, Pagination…
- **Hiển thị nội dung do người dùng nhập:** không dùng `dangerouslySetInnerHTML`. Xem ví dụ bộ dựng an toàn trong `components/research/ArticleBody.jsx`.

### 5.5 Phong cách code nhóm đang theo
- **Comment tiếng Việt chi tiết** ở mọi file:
  - Đầu file: file làm gì, nằm ở đâu trong luồng (ví dụ `Register.jsx → authService → AuthController → AuthService → Repository`), vì sao cần.
  - Dòng code khó hiểu: thêm comment ngay tại chỗ.
  - **Không ghi số mục SRS hay mã use case trong comment**, chỉ giải thích code.
- **Không lặp code:** tận dụng hook, util, `OtpService`, `MailService`, `FileStorageService` có sẵn.
- **Giao diện chỉn chu:** thông báo tiếng Việt, xử lý trạng thái loading / rỗng / lỗi, giao diện vẫn dùng được trên màn hình hẹp.
- **Làm từng tính năng một:** test (API + giao diện) → giải thích → commit trên máy. Commit message theo dạng `feat: ...`, `fix: ...`.
- **Không push / tạo PR lên GitHub khi chưa thống nhất với cả nhóm.**

### 5.6 Luật về bảng dữ liệu (QUAN TRỌNG)
- **KHÔNG tạo thêm bảng mới** (không thêm class `@Entity` mới). DB hiện có đúng **11 bảng**:
  - Theo thiết kế: `users`, `categories`, `submissions`, `evidences`, `field_assignments`, `editorial_reviews`, `reputation_logs`.
  - Bổ sung đã có: `otp_tokens`, `submission_events`, `contributor_applications`, `research_articles`.
- `editorial_reviews` dùng chung cho hồ sơ phản ánh (`submission_id`) và bài nghiên cứu (`research_article_id`):
  mỗi thao tác của toà soạn là 1 dòng (`action` = `REQUEST_EDIT` / `APPROVE` / `REJECT`...). Luồng hồ sơ nhớ lọc `submission_id IS NOT NULL`.
  - **Cả nhóm cần chạy 1 lần** (ddl-auto không tự bỏ NOT NULL): `ALTER TABLE editorial_reviews MODIFY submission_id BIGINT NULL;`
- Tính năng mới phải dùng các bảng trên. Ưu tiên bảng có sẵn trong thiết kế (ví dụ luồng kiểm duyệt dùng `editorial_reviews`,
  giao việc CTV dùng `field_assignments`, điểm uy tín dùng `reputation_logs`).
- **ĐƯỢC PHÉP thêm cột / trường** vào bảng có sẵn khi cần lưu thêm thông tin:
  - Thêm trường vào entity rồi khởi động lại backend để Hibernate tự thêm cột.
  - Cột enum mới khai báo `columnDefinition = "VARCHAR(30)"` (tránh bẫy ENUM ở mục 5.3).
  - Cột mới nên cho phép NULL (hoặc có giá trị mặc định) để dữ liệu cũ không lỗi.
- Nếu thật sự không thể làm mà không có bảng mới: **dừng lại**, giải thích lý do và chờ cả nhóm đồng ý.

---

## 6. Dữ liệu & trạng thái chính

- **`users.status`:**
  - `PENDING_OTP`: vừa đăng ký, chưa xác thực.
  - `ACTIVE`.
  - `LOCKED`: admin khoá.
  - Khoá tạm do nhập sai mật khẩu nhiều lần thì dùng cột `locked_until` (không đổi status).
- **`users.upgrade_status`:** `NONE` / `PENDING` / `APPROVED` / `REJECTED`. Đây là cột tóm tắt trạng thái nâng cấp lên CTV.
- **`submissions`:**
  - `tracking_code` dạng `KB-2026-0007`; `pin_hash`; `report_category` (`HOT_NEWS`, `COMPLAINT`, `INVESTIGATION`).
  - Quyền gửi theo loại:
    - Người dân, CTV, Chuyên gia: gửi được tin nóng và khiếu nại.
    - Chỉ CTV: gửi được phóng sự điều tra.
  - `status` bắt đầu từ `PENDING`. Enum còn có các trạng thái cho các bước sau: `IN_REVIEW`, `NEED_MORE_INFO`, `DEPUTY_PENDING`, … `PUBLISHED`.
  - Dòng thời gian xử lý lưu ở `submission_events`; tệp đính kèm lưu ở `evidences`.
- **`contributor_applications.status`:**
  - Luồng chính: `PENDING_EDITOR` → `PENDING_DEPUTY` → `APPROVED`.
  - Kết thúc khác: `REJECTED` / `WITHDRAWN`.
  - Giấy tờ lưu dạng JSON.
- **`research_articles.status`:** `DRAFT` / `SUBMITTED`.
  - Chỉ bài `DRAFT` mới sửa / xoá được.
  - Điều kiện nộp: tiêu đề ≥ 10 ký tự, tóm tắt ≥ 100 ký tự, nội dung ≥ 300 chữ, ≥ 1 ảnh (tối đa 8 ảnh, mỗi ảnh ≤ 5MB), có tài liệu tham khảo, có khai báo xung đột lợi ích, có tick cam kết.
- **`otp_tokens`:**
  - Mục đích (`purpose`): `REGISTER`, `RESET_PASSWORD`, `CHANGE_EMAIL`.
  - `payload` lưu email mới khi đổi email.
  - Hệ thống chỉ kiểm tra mã **mới nhất**.

Các tham số cấu hình (thời hạn OTP, số lần sai, ngưỡng tuổi / điểm uy tín, giới hạn upload…) nằm trong `application.properties`, mục `app.*`.

---

## 7. Ghi chú cho Claude khi làm tiếp
- **Người dùng chính:** sinh viên mới học code. Trả lời bằng **tiếng Việt, xưng "tớ / cậu"**, giải thích đơn giản.
- **Trước khi làm:** đọc file liên quan và bám theo cách code sẵn có (mục 5). Không đổi API hay tên hàm đang được dùng.
- **Tài liệu SRS/SDS:** chỉ dùng để hiểu ý định. Khi tài liệu mâu thuẫn với code, chọn phương án đơn giản, hợp lý và nói rõ trong một dòng.
- **Kiểm thử:** test bằng server riêng (ví dụ backend `--server.port=8081 --app.mail.enabled=false`, frontend `API_TARGET=http://localhost:8081` ở cổng 5174), để không đụng tới server đang chạy của người dùng. Test xong thì dọn dữ liệu test.
- **Không** commit `.env`, **không** push / tạo PR khi chưa được đồng ý.
- Rút gọn kết quả in ra khi chạy test bằng lệnh npx vitest run -- reporter=dot

---

## 8. Ghi log thay đổi source code
- Xem quy tắc chi tiết tại `.agents/rules/ai-logging.md`.