# Báo cáo thay đổi: Hàng đợi tin bài, biên tập và duyệt bài nghiên cứu

> Phạm vi: toàn bộ code Claude viết hoặc sửa trong phiên ngày 23/10/2026 (khớp với `ai-log.md`), **sau khi đã tối ưu (Mức B + DB)**.
> Trạng thái: **chưa commit**. Các thay đổi chưa commit khác của nhóm trong working tree **không** nằm trong báo cáo này.

Đường dẫn rút gọn: `BE/` = `citizen_journalism/src/main/java/com/example/citizen_journalism/`, `FE/` = `citizen_journalism/frontend/src/`.

---

## Mục lục
1. [Tóm tắt những gì đã thay đổi](#1-tóm-tắt-những-gì-đã-thay-đổi)
2. [Cơ sở dữ liệu](#2-cơ-sở-dữ-liệu)
3. [Các file đã TẠO MỚI](#3-các-file-đã-tạo-mới)
4. [Các method / hàm, theo từng file](#4-các-method--hàm-theo-từng-file)
5. [Sửa code có sẵn ở đâu](#5-sửa-code-có-sẵn-ở-đâu)
6. [Luồng code từng chức năng (đi từng bước)](#6-luồng-code-từng-chức-năng-đi-từng-bước)

---

## 1. Tóm tắt những gì đã thay đổi

| # | Chức năng | Ai dùng | Màn hình |
|---|---|---|---|
| 1 | Hàng đợi tin bài gộp thêm **bài nghiên cứu**; lọc **Loại** + **Lĩnh vực**; cột Loại / Khu vực / Lĩnh vực (thiếu thì `NA`) | Biên tập viên (BTV) | `/editor/queue` |
| 2 | Danh sách lĩnh vực lấy từ bảng `categories`; tự tạo 5 chuyên mục mặc định khi bảng rỗng | Hệ thống | (lúc khởi động) |
| 3 | Nút **Mở** trên mọi dòng; bài nghiên cứu mở trang chi tiết | BTV | `/editor/queue/research/:id` |
| 4 | **Yêu cầu chỉnh sửa**: BTV sửa 4 ô, phần thay đổi được highlight, xác nhận rồi gửi Chuyên gia | BTV | trang chi tiết |
| 5 | Chuyên gia **bình luận**, **điều chỉnh**, **Đồng ý** / **Từ chối** (bắt buộc lý do); xem bản gốc + bản sau chỉnh sửa | Chuyên gia | `/research`, `/research/revisions/:id` |
| 6 | Màn **Biên tập bài viết**: danh sách + tình trạng biên tập + kết quả duyệt, có bộ lọc | BTV | `/editor/articles` |
| 7 | **Duyệt** (chấm Low / Medium / High, chuyển Phó TBT phụ trách lĩnh vực) và **Từ chối** (bắt buộc lý do) | BTV | trang chi tiết |
| 8 | Kết quả duyệt (bị từ chối + lý do / đã duyệt) hiện **trong thẻ bài** | Chuyên gia | `/research` |
| 9 | Xem bài rồi quay lại vẫn đúng tab **Bản nháp / Đã nộp** | Chuyên gia | `/research` |
| 10 | **Tối ưu**: còn 3 file backend + 4 file frontend (ngoài 3 trang); DB về **11 bảng** | — | — |

---

## 2. Cơ sở dữ liệu

**Không tạo bảng mới.** DB có **11 bảng** (7 bảng thiết kế + 4 bảng nhóm đã có). Luồng biên tập dùng **bảng thiết kế `editorial_reviews`**.

### 2.1 `editorial_reviews`: mỗi thao tác của BTV trên 1 bài = 1 dòng

| Thao tác | `action` | `status` | `comments` | `content_snapshot` (JSON) |
|---|---|---|---|---|
| Yêu cầu chỉnh sửa | `REQUEST_EDIT` | `PENDING` → `ACCEPTED` / `REJECTED` | — | `{original, proposed, finalVersion, respondedAt, comments:[{authorId, authorName, authorRole, content, rejection, createdAt}]}` |
| Duyệt | `APPROVE` | — | Ghi chú cho Phó TBT | `{fieldScore, conflict, mention, impactScore, deputyId, deputyName}` |
| Từ chối | `REJECT` | — | Lý do từ chối | — |

Cột chung: `reviewer_id` (BTV), `review_role` = `EDITOR`, `created_at` (thời điểm thao tác), `updated_at` (lần đổi gần nhất).

**Đã sửa entity `EditoralReview`** (bảng thiết kế):
- Thêm `research_article_id`.
- Thêm `status` (VARCHAR).
- `submission_id` cho phép NULL. Cả nhóm cần chạy `ALTER TABLE editorial_reviews MODIFY submission_id BIGINT NULL;`.

### 2.2 `research_articles`: thêm 2 cột

| Cột | Ý nghĩa |
|---|---|
| `review_status` (VARCHAR) | `NULL` = chờ BTV duyệt; `DEPUTY_PENDING` = đã duyệt, chuyển Phó TBT; `REJECTED` = BTV từ chối |
| `priority` (VARCHAR) | `LOW` / `MEDIUM` / `HIGH` |

Hai cột này để **lọc hàng đợi** và **hiện nhãn** nhanh. Chi tiết (ai, lúc nào, lý do, điểm, Phó TBT) nằm ở dòng `APPROVE` / `REJECT`.

### 2.3 Đã chuyển dữ liệu
- 2 yêu cầu chỉnh sửa (kèm 2 bình luận) và kết quả "Từ chối" của NC-7 đã chuyển sang `editorial_reviews`. Tớ đã đối chiếu từng trường trước khi xoá.
- Đã xoá các bảng `research_revision_requests`, `research_revision_comments`, cùng 6 cột cũ của `research_articles`.

---

## 3. Các file đã TẠO MỚI

### 3.1 Backend (3 file)

| File | Vai trò |
|---|---|
| `BE/controller/ResearchEditorialController.java` | **Mọi API** của luồng: phần BTV (`/api/editor/...`) và phần Chuyên gia (`/api/research/revisions/...`, `/api/research/review-results`) |
| `BE/service/ResearchEditorialService.java` | **Mọi nghiệp vụ**, chia 8 khu: (1) record dữ liệu, (2) tiêu chuẩn chấm điểm, (3) hàng đợi + Biên tập bài viết, (4) chi tiết bài, (5) yêu cầu chỉnh sửa, (6) duyệt / từ chối, (7) tạo chuyên mục mặc định, (8) hàm phụ |
| `BE/repository/ResearchEditorialRepository.java` | **Mọi câu truy vấn**: repository của `EditoralReview`, có thêm `@Query` đọc `submissions`, `research_articles`, `categories` |

### 3.2 Frontend (2 file mới + 3 trang)

| File | Vai trò |
|---|---|
| `FE/routes/editor/EditorResearchDetail.jsx` | Trang chi tiết BTV: Sửa bài, Duyệt (form chấm điểm nằm cuối file), Yêu cầu chỉnh sửa, Từ chối, lịch sử |
| `FE/routes/editor/EditorArticles.jsx` | Màn Biên tập bài viết |
| `FE/routes/ExpertRevisionReview.jsx` | Chuyên gia xử lý 1 yêu cầu chỉnh sửa |
| `FE/components/research/ResearchEditorial.jsx` | 6 khối dùng chung: `RevisionDiff`, `RevisionVersions`, `RevisionComments`, `ReasonDialog`, `PendingRevisionsBanner`, `ReviewResultNote` |
| `FE/lib/researchEditorial.js` | Hằng số nhãn / màu, tiêu chuẩn chấm điểm (bản sao), thuật toán so sánh chữ `diffWords` |
| `FE/assets/styles/revision.css` | Giao diện toàn bộ phần trên |

---

## 4. Các method / hàm, theo từng file

### 4.1 `ResearchEditorialController`

| Method | HTTP | Gọi xuống service |
|---|---|---|
| `listQueue` | `GET /api/editor/queue?status&type&field&page&size` | `listQueue` |
| `listFields` | `GET /api/editor/queue/fields` | `listFields` |
| `listArticles` | `GET /api/editor/articles?editStatus&field&q&page&size` | `listArticles` |
| `getDetail` | `GET /api/editor/research/{id}` | `getDetail` |
| `requestRevision` | `POST /api/editor/research/{id}/revision-requests` | `requestRevision` |
| `approve` | `POST /api/editor/research/{id}/approve` | `approve` |
| `reject` | `POST /api/editor/research/{id}/reject` | `reject` |
| `editorComment` | `POST /api/editor/research/revisions/{revisionId}/comments` | `comment` |
| `listMyRevisions` | `GET /api/research/revisions` | `listMyRevisions` |
| `getMyRevision` | `GET /api/research/revisions/{id}` | `getMyRevision` |
| `expertComment` | `POST /api/research/revisions/{id}/comments` | `comment` |
| `acceptRevision` | `POST /api/research/revisions/{id}/accept` | `acceptRevision` |
| `rejectRevision` | `POST /api/research/revisions/{id}/reject` | `rejectRevision` |
| `listMyReviewResults` | `GET /api/research/review-results` | `listMyReviewResults` |

### 4.2 `ResearchEditorialService`

**Khu 1: record dữ liệu** (nằm trong service, không còn thư mục DTO riêng)

| Record / enum | Dùng để |
|---|---|
| `QueueType`, `QueueItem` | Loại + 1 dòng hàng đợi |
| `EditStatus`, `ArticleItem` | Tình trạng biên tập + 1 dòng Biên tập bài viết |
| `Fields` | 4 ô (tiêu đề, tóm tắt, từ khoá, nội dung), vừa là **dữ liệu gửi lên** (có validate) vừa là **1 phiên bản** để hiển thị |
| `Comment`, `RevisionSnapshot` | JSON lưu trong dòng `REQUEST_EDIT` |
| `Revision` | 1 yêu cầu chỉnh sửa gửi cho frontend |
| `ApproveSnapshot` | JSON lưu trong dòng `APPROVE` |
| `Review`, `ReviewResult`, `ApprovalInfo` | Phần duyệt ở trang chi tiết |
| `Detail`, `Author` | Chi tiết bài cho BTV |
| `MyReviewResult` | Kết quả duyệt trong thẻ bài của Chuyên gia |
| `ApproveBody`, `CommentBody`, `RejectBody` | Dữ liệu gửi lên khi Duyệt / bình luận / từ chối |

**Khu 2–8: method**

| Method | public / private | Làm gì |
|---|---|---|
| `Conflict`, `Mention` (enum có điểm), `fieldScore(field)`, `priorityOf(total, conflict, mention)` | enum + private static | Tiêu chuẩn chấm: Chính trị - Xã hội 3, Pháp luật 3, Kinh tế 2, Y tế - Sức khoẻ 2, Đời sống 0, khác 1; tổng ≥ 7 HIGH, ≥ 4 MEDIUM; công kích thiếu dẫn chứng luôn HIGH; xung đột không khai báo ít nhất MEDIUM |
| `listQueue(status, type, field, page, size)` | public | Lấy `(page+1)*size` dòng đầu của mỗi bảng, trộn theo thời gian, cắt đúng trang |
| `listFields()` | public | Tên chuyên mục đang bật |
| `listArticles(editStatus, field, keyword, page, size)` | public | Danh sách Biên tập bài viết + đếm số lần sửa, tình trạng, cập nhật gần nhất |
| `getDetail(articleId)` | public | Chi tiết bài + tác giả + lịch sử yêu cầu + phần duyệt |
| `requestRevision(editorId, articleId, body)` | public | BTV gửi yêu cầu (kiểm tra 404 / 409 / lỗi theo ô / 400), lưu dòng `REQUEST_EDIT`, email tác giả |
| `listMyRevisions(expertId)`, `getMyRevision(expertId, id)` | public | Yêu cầu của Chuyên gia (chỉ bài của mình) |
| `comment(userId, revisionId, content)` | public | **Dùng chung 2 phía**: BTV bình luận mọi yêu cầu, Chuyên gia chỉ yêu cầu của bài mình |
| `acceptRevision(expertId, id, body)` | public | Áp bản cuối vào bài, `status = ACCEPTED`, lưu bản cuối, email BTV |
| `rejectRevision(expertId, id, reason)` | public | Lý do thành 1 bình luận `rejection = true`, `status = REJECTED`, email BTV |
| `approve(editorId, articleId, body)` | public | Chấm điểm, ghi dòng `APPROVE`, đổi `review_status` / `priority`, email Phó TBT + tác giả |
| `reject(editorId, articleId, reason)` | public | Ghi dòng `REJECT`, `review_status = REJECTED`, email tác giả |
| `listMyReviewResults(expertId)` | public | Kết quả duyệt các bài của Chuyên gia (chỉ trả lý do khi bị từ chối) |
| `createDefaultCategories()` | public, `@EventListener` | Khởi động xong: bảng `categories` rỗng thì tạo 5 chuyên mục |
| `findSubmitted`, `findRequest` | private | Tìm bài đã nộp / yêu cầu (có kiểm tra chủ bài), không thấy thì 404 |
| `requestsOf`, `decisionOf`, `hasPendingRequest`, `requireNoDecision` | private static | Tách danh sách dòng của 1 bài thành yêu cầu / kết quả duyệt; kiểm tra điều kiện |
| `reviewOf`, `toResult`, `blockedReason`, `findDeputy` | private | Phần duyệt: kết quả đã có, hoặc form điền sẵn + lý do bị chặn; tìm Phó TBT theo chuyên mục |
| `toRevision`, `readPending`, `saveSnapshot`, `commentOf`, `toJson` | private | Đọc / ghi JSON của yêu cầu |
| `clean`, `checkFields` | private static | Làm sạch + kiểm tra 4 ô (tiêu đề ≥ 10 ký tự, tóm tắt ≥ 100 ký tự, nội dung ≥ 300 chữ) |
| `byTime`, `queueItemOf(Submission)`, `queueItemOf(ResearchArticle)` | private static | Sắp xếp + đổi dữ liệu thành dòng hàng đợi |
| `mailEditorAboutReply`, `sendMail`, `escape` | private | Email (lỗi gửi chỉ ghi log) |

### 4.3 `ResearchEditorialRepository`

| Method | Làm gì |
|---|---|
| `findByResearchArticleIdOrderByIdDesc(articleId)` | Mọi dòng của 1 bài, mới nhất trước |
| `findByResearchArticleAuthorIdOrderByIdDesc(authorId)` | Mọi dòng thuộc các bài của 1 Chuyên gia |
| `searchSubmissions(...)` | Hồ sơ phản ánh theo trạng thái / loại / chuyên mục |
| `searchResearch(...)` | Bài nghiên cứu cho hàng đợi, lọc theo kết quả duyệt |
| `searchArticlesForEditing(...)` | Bài cho Biên tập bài viết, lọc theo yêu cầu gần nhất (`r.status is not null` = là yêu cầu chỉnh sửa) |
| `findActiveCategoryNames()`, `findDeputiesOfCategory(name)`, `countCategories()`, `insertDefaultCategories()` | Chuyên mục |
| (có sẵn từ `JpaRepository`) `save`, `findById` | Ghi / đọc 1 dòng `editorial_reviews` |

### 4.4 Frontend

| File | Hàm / component |
|---|---|
| `FE/lib/researchEditorial.js` | `QUEUE_TYPES`, `QUEUE_TYPE_BY_VALUE`, `REVISION_STATUS`, `EDIT_STATUS`, `COMMENT_ROLE`, `toFormValues`, `PRIORITY_INFO`, `reviewStatusInfo`, `CONFLICT_OPTIONS`, `MENTION_OPTIONS`, `evaluatePriority`, `optionLabel`, `diffWords` |
| `FE/components/research/ResearchEditorial.jsx` | `RevisionDiff`, `RevisionVersions`, `RevisionComments` (hàm `submit`), `ReasonDialog` (hàm `close`, `submit`), `PendingRevisionsBanner`, `ReviewResultNote` |
| `EditorResearchDetail.jsx` | `EditorResearchDetail`, `ResearchReview` (hàm `reviewed`, `cancelEdit`, `sendRevision`, `postComment`), `ReviewResultPanel`, `ApproveResearchDialog` (hàm `close`, `submit`), `RubricGroup` |
| `ExpertRevisionReview.jsx` | `ExpertRevisionReview`, `RevisionReview` (hàm `done`, `accept`, `cancelAdjust`) |
| `EditorArticles.jsx` | `EditorArticles` (hàm `changeFilter`) |
| `FE/services/editorService.js` (đã thêm trước đó) | `listQueue`, `listQueueFields`, `getResearch`, `requestRevision`, `approveResearch`, `rejectResearch`, `commentRevision`, `listArticles` |
| `FE/services/researchService.js` (thêm) | `listRevisions`, `getRevision`, `commentRevision`, `acceptRevision`, `rejectRevision`, `listReviewResults` |

---

## 5. Sửa code có sẵn ở đâu

Mọi chỗ sửa vào file của thành viên khác đều đã được **xin duyệt** trước.

| File | Chủ file | Sửa gì |
|---|---|---|
| `BE/entity/EditoralReview.java` | Binh2k5 (thiết kế) | Thêm `researchArticle`, `status` + enum `RequestStatus`; `submission` cho phép NULL |
| `BE/entity/ResearchArticle.java` | Ank298 | Thêm `reviewStatus`, `priority` + 2 enum (6 cột thêm trước đó đã bỏ lại) |
| `BE/service/ResearchArticleService.java` | Ank298 | Thêm `getSubmittedForStaff(id)`: đọc bài đã nộp cho toà soạn (dùng lại `toView`) |
| `FE/services/researchService.js` | Ank298 | Thêm 6 hàm (mục 4.4) |
| `FE/routes/ResearchList.jsx` | Ank298 | Banner yêu cầu; khung kết quả trong thẻ bài; tab lưu trên URL `?status=` |
| `FE/routes/ResearchEditor.jsx` | Ank298 | Nút "← Bài nghiên cứu của tôi" ở bài đã nộp về `/research?status=SUBMITTED` |
| `FE/routes/editor/EditorQueue.jsx` | Nhóm | Gọi `listQueue`; lọc Loại + Lĩnh vực; cột Loại / Khu vực / Lĩnh vực; nút Mở |
| `FE/services/editorService.js` | Nhóm | Thêm 8 hàm |
| `FE/App.jsx` | Nhóm | Thêm 3 route: `queue/research/:id`, `articles`, `/research/revisions/:id` |
| `FE/components/editor/EditorLayout.jsx` | Nhóm | Bỏ nhãn "Sắp có" ở "Biên tập bài viết" |
| `CLAUDE.md` | Nhóm | Mục 5.3 (bẫy ENUM), 5.6 (11 bảng, cách dùng `editorial_reviews`, câu ALTER) |

**Không sửa:** `SecurityConfig` (luật có sẵn đã đủ), `SubmissionRepository`, `UserRepository`, `MailService`, `GlobalExceptionHandler`, `useForm`, `useAsyncData`, `api.js`.

---

## 6. Luồng code từng chức năng (đi từng bước)

### 6.0 Các bước chung mọi request đều đi qua (gọi tắt **[Bước chung]**)
1. **`lib/api.js`**: tự gắn header `Authorization: Bearer <token>`.
2. **Vite proxy** chuyển `/api/...` sang backend.
3. **Spring Security**: `/api/editor/**` chỉ cho EDITOR, `/api/research/**` chỉ cho EXPERT; sai vai trò thì trả 403.
4. **`ResearchEditorialController`**:
   - `jwt.getSubject()` = mã người dùng.
   - `@Valid @RequestBody` kiểm tra annotation trong record. Sai thì `GlobalExceptionHandler` trả lỗi theo từng ô.
5. **`ResearchEditorialService`** (`@Transactional`):
   - Lỗi nghiệp vụ ném `AppException` (404 / 409 / 400).
   - Sửa entity thì **không cần `save()`**, JPA tự ghi khi hết transaction.
6. Controller trả `ApiResponse.ok("Thông báo", data)`.
7. `lib/api.js` trả `{ success, message, data }`; nếu lỗi thì reject `{ status, message, errors }`.
8. Frontend hiện lỗi:
   - trong `useForm.handleSubmit`: lỗi hiện dưới từng ô hoặc ở Alert đầu form;
   - trong `useAsyncData`: lỗi nằm ở biến `error`.

---

### 6.1 BTV mở "Hàng đợi tin bài" và lọc

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `EditorQueue.jsx` → `useAsyncData(() => editorService.listQueueFields())` | `GET /api/editor/queue/fields` → [Bước chung] → `listFields` → `repository.findActiveCategoryNames()` |
| 2 | Đổi ô lọc → `changeFilter(setter)` | Đặt giá trị mới, về trang 0 → `useAsyncData` tự tải lại |
| 3 | `editorService.listQueue({status, type, field, page, size})` | `GET /api/editor/queue?...` → [Bước chung] → controller `listQueue` |
| 4 | `service.listQueue` | Quyết định đọc bảng nào: `type = RESEARCH` thì chỉ bài nghiên cứu; trạng thái `IN_REVIEW`… thì bỏ bài nghiên cứu |
| 5 | `repository.searchSubmissions` → `queueItemOf(Submission)` | Lấy hồ sơ phản ánh |
| 6 | `repository.searchResearch` → `queueItemOf(ResearchArticle)` | Lấy bài nghiên cứu (mã `NC-<id>`, trạng thái quy đổi theo `review_status`) |
| 7 | (tiếp) | Trộn 2 danh sách theo thời gian, cắt đúng trang → `PageResponse` |
| 8 | `EditorQueue.jsx` render | Cột Loại (`QUEUE_TYPE_BY_VALUE`), Khu vực / Lĩnh vực (`NA` nếu thiếu). Nút Mở: bài nghiên cứu → `/editor/queue/research/<id>` |

### 6.2 BTV bấm "Mở" một bài nghiên cứu

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `App.jsx` route `queue/research/:id` → `EditorResearchDetail` | |
| 2 | `useAsyncData(() => editorService.getResearch(id))` | `GET /api/editor/research/{id}` → [Bước chung] → controller `getDetail` |
| 3 | `service.getDetail` → `researchArticleService.getSubmittedForStaff(id)` | Nội dung bài (bản nháp thì 404) |
| 4 | → `repository.findByResearchArticleIdOrderByIdDesc(id)` | Mọi dòng `editorial_reviews` của bài |
| 5 | → `requestsOf(rows)` → `toRevision` | Lịch sử yêu cầu (đọc JSON `content_snapshot`) |
| 6 | → `reviewOf(article, rows)` | Đã có dòng `APPROVE` / `REJECT` thì trả kết quả (`toResult`). Chưa có thì trả thông tin form Duyệt: điểm lĩnh vực, gợi ý xung đột, Phó TBT (`findDeputy`), lý do bị chặn (`blockedReason`) |
| 7 | `ResearchReview` | Bật / tắt 4 nút; hiện cảnh báo bị chặn; hiện `ReviewResultPanel` nếu đã có kết quả; bài hiển thị bằng `ResearchReader` |

### 6.3 BTV "Sửa bài" → "Yêu cầu chỉnh sửa"

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | Click "Sửa bài" → `setEditing(true)` | Hiện form 4 ô (`useForm`, giá trị ban đầu = bài gốc) |
| 2 | `<RevisionDiff original proposed={form.values}>` (`ResearchEditorial.jsx`) | Mỗi ô có thay đổi thì gọi `diffWords` (`lib/researchEditorial.js`): chữ thêm `<ins>` vàng, chữ xoá `<del>` đỏ |
| 3 | Click "Yêu cầu chỉnh sửa" → `setConfirming(true)` → `ConfirmDialog` | |
| 4 | Xác nhận → `sendRevision = form.handleSubmit(...)` | Kiểm tra 3 ô bắt buộc trên trình duyệt |
| 5 | `editorService.requestRevision(id, values)` | `POST /api/editor/research/{id}/revision-requests` → [Bước chung] (`@Valid Fields`) |
| 6 | `service.requestRevision` | `getActiveById` → `findSubmitted` (404) → đã có kết quả duyệt thì 409 → đang có yêu cầu chờ thì 409 → `checkFields` (lỗi theo ô) → không đổi gì thì 400 |
| 7 | → `repository.save(EditoralReview.builder()...)` | 1 dòng `REQUEST_EDIT`, `status = PENDING`, `content_snapshot` = bản gốc + bản đề xuất. **Bài gốc giữ nguyên** |
| 8 | → `sendMail(author, ...)` → `toRevision(row)` | Email báo Chuyên gia |
| 9 | `sendRevision` (tiếp) → `onRevisionChange(response.data)` | Trang chuyển sang "Yêu cầu đang chờ", các nút bị khoá |

### 6.4 Bình luận trong yêu cầu đang chờ (cả 2 phía)

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `RevisionComments.submit` → `await onPost(text)` | |
| 2a | BTV: `postComment` → `editorService.commentRevision(revisionId, content)` | `POST /api/editor/research/revisions/{id}/comments` → controller `editorComment` |
| 2b | Chuyên gia: `researchService.commentRevision(id, content)` | `POST /api/research/revisions/{id}/comments` → controller `expertComment` |
| 3 | `service.comment(userId, id, content)` | `findRequest(id, ownerId)`: Chuyên gia chỉ được bài của mình, sai thì 404 |
| 4 | → `readPending(row)` → `saveSnapshot(..., commentOf(user, content, false))` | Đã xử lý xong thì 409. Không thì thêm 1 bình luận (kèm vai trò lúc viết) vào JSON |
| 5 | → `toRevision(row)` | Khung trao đổi hiện bình luận mới |

### 6.5 Chuyên gia thấy yêu cầu trên `/research`

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `ResearchList.jsx` → `<PendingRevisionsBanner />` | |
| 2 | `useAsyncData(() => researchService.listRevisions())` | `GET /api/research/revisions` → `service.listMyRevisions` → `findByResearchArticleAuthorIdOrderByIdDesc` → `requestsOf` → `toRevision` |
| 3 | Banner | Yêu cầu `PENDING` → khung cam + nút "Xem"; đã xử lý → mục "Lịch sử chỉnh sửa" |

### 6.6 Chuyên gia "Điều chỉnh đề xuất" và "Đồng ý"

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `/research/revisions/:id` → `ExpertRevisionReview` → `researchService.getRevision(id)` | `service.getMyRevision` → `findRequest(id, expertId)` |
| 2 | `RevisionReview` | `useForm(toFormValues(revision.proposed))`, mặc định = bản đề xuất. `RevisionVersions` hiện các tab |
| 3 | "Điều chỉnh đề xuất" → `setAdjusting(true)` | Form 4 ô + `RevisionDiff` so với **bản gốc** |
| 4 | "Đồng ý" → `ConfirmDialog` → `accept = form.handleSubmit(...)` → `researchService.acceptRevision(id, values)` | `POST /api/research/revisions/{id}/accept` (`@Valid Fields`) |
| 5 | `service.acceptRevision` | `findRequest` → `readPending` → `checkFields` → `article.setTitle / setAbstractText / setKeywords / setContent` (**cập nhật bài thật**) → `status = ACCEPTED` → `saveSnapshot(..., finalVersion, now, null)` |
| 6 | → `mailEditorAboutReply(...)` → `toRevision` | Email BTV; `expertAdjusted` = bản cuối khác bản đề xuất |
| 7 | `done(response)` | Trang chuyển sang chỉ xem, có thêm tab "Bản sau chỉnh sửa" |

### 6.7 Chuyên gia "Từ chối" yêu cầu

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | "Từ chối" → `ReasonDialog` → `submit` | Bắt buộc lý do ≥ 10 ký tự |
| 2 | `researchService.rejectRevision(id, reason)` | `POST /api/research/revisions/{id}/reject` (`@Valid RejectBody`) |
| 3 | `service.rejectRevision` | `findRequest` → `readPending` → `status = REJECTED` → `saveSnapshot(..., commentOf(expert, reason, true))` (lý do = bình luận viền đỏ) → email BTV. **Bài giữ nguyên** |

### 6.8 BTV mở "Biên tập bài viết"

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | Gõ tìm → `useDebouncedValue` | Chờ ngừng gõ mới tìm |
| 2 | `editorService.listArticles({editStatus, field, q, page})` | `GET /api/editor/articles?...` → `service.listArticles` |
| 3 | → `repository.searchArticlesForEditing(...)` | Lọc theo yêu cầu **gần nhất** của bài (`max(id)` trong các dòng có `status`) |
| 4 | Mỗi bài → `findByResearchArticleIdOrderByIdDesc` → `requestsOf` / `decisionOf` | Số lần sửa, tình trạng, "cập nhật gần nhất" (lúc duyệt > lần đổi gần nhất của yêu cầu > lúc nộp) |
| 5 | `EditorArticles` render | Badge tình trạng + kết quả duyệt + cấp độ; nút Mở → mục 6.2 |

### 6.9 BTV bấm "Duyệt"

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | "Duyệt" → `ApproveResearchDialog` (cuối `EditorResearchDetail.jsx`) | Form `{conflict: gợi ý, mention: '', note: ''}` |
| 2 | Chọn radio (`RubricGroup`) → `evaluatePriority(...)` | Tổng điểm + cấp độ hiện ngay |
| 3 | "Duyệt và chuyển" → `submit` → `editorService.approveResearch(id, values)` | `POST /api/editor/research/{id}/approve` (`@Valid ApproveBody`) |
| 4 | `service.approve` | `findSubmitted` → `requireNoDecision` (409) → `findDeputy` → `blockedReason` (409 nếu đang chờ Chuyên gia / chưa có Phó TBT) |
| 5 | (tiếp) | **Tự tính lại điểm**: `fieldScore + conflict.score + mention.score` → `priorityOf` → `article.setReviewStatus(DEPUTY_PENDING)`, `setPriority` |
| 6 | → `repository.save(... action APPROVE, comments = ghi chú, content_snapshot = ApproveSnapshot)` | Lưu điểm từng tiêu chí + Phó TBT lúc duyệt |
| 7 | → `sendMail(deputy)` + `sendMail(author)` → `toResult` | |
| 8 | `reviewed(response)` → `onReviewChange` | Hiện `ReviewResultPanel`, khoá mọi nút |

### 6.10 BTV bấm "Từ chối" bài

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | "Từ chối" → `ReasonDialog` → `editorService.rejectResearch(id, reason)` | `POST /api/editor/research/{id}/reject` (`@Valid RejectBody`) |
| 2 | `service.reject` | `findSubmitted` → `requireNoDecision` → đang có yêu cầu chờ thì 409 |
| 3 | (tiếp) | `review_status = REJECTED`; lưu dòng `REJECT` (`comments` = lý do); email tác giả. Bài dừng xử lý |

### 6.11 Chuyên gia thấy kết quả trong thẻ bài

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `ResearchList.jsx` → `researchService.listReviewResults()` | `GET /api/research/review-results` → `service.listMyReviewResults` → các dòng `APPROVE` / `REJECT` thuộc bài của mình |
| 2 | `reviewOf(item.id)` → `<ReviewResultNote result>` | Bị từ chối: khung đỏ + lý do. Đã duyệt: khung xanh (ghi chú cho Phó TBT **không** gửi cho Chuyên gia) |

### 6.12 Xem bài rồi quay lại vẫn đúng tab

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | `ResearchList.jsx` → `useSearchParams()` | Đọc tab từ URL `?status=`; thiếu hoặc sai thì là Bản nháp |
| 2 | Click tab → `setSearchParams({status}, {replace: true})` | Đổi tab không thêm bước vào lịch sử trình duyệt |
| 3 | Back trình duyệt / nút "← Bài nghiên cứu của tôi" (`/research?status=SUBMITTED`) | Về đúng tab cũ |

### 6.13 Tạo chuyên mục mặc định

| Bước | File → hàm | Làm gì |
|---|---|---|
| 1 | Spring khởi động xong → `ApplicationReadyEvent` | |
| 2 | `service.createDefaultCategories()` | `countCategories() == 0` thì `insertDefaultCategories()` (5 chuyên mục, chưa gán Phó TBT) |

> **Lưu ý vận hành:** chưa có màn hình Admin gán Phó TBT. Muốn nút **Duyệt** dùng được, cần chạy SQL, ví dụ
> `UPDATE categories SET deputy_eic_id = 'DE0001';`
