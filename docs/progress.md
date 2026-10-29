# Tiến độ dự án – Tin Nóng Dân Sinh (SWP391 – Group 1)

> File này theo dõi chi tiết trạng thái từng chức năng qua các Iteration, giúp toàn đội và AI (Claude Code) nắm rõ những gì đã hoàn thành và những việc cần làm tiếp theo.

---

## 1. Iteration 1 – Trạng thái chức năng

| Chức năng | Trạng thái | Ghi chú chi tiết |
|---|:---:|---|
| **View home page** | ✅ | Chỉ có frontend (`Homepage.jsx`) |
| **Register Account** | ✅ | Tạo tài khoản CITIZEN ở trạng thái `PENDING_OTP` |
| **Verify user authentic (OTP email)** | ✅ | Mã 6 số, hết hạn sau 5 phút, sai tối đa 5 lần, chờ 60s mới gửi lại |
| **Log In** | ✅ | Email hoặc tên đăng nhập; có "Ghi nhớ đăng nhập" (7 ngày); sai 5 lần khoá 15 phút |
| **Forgot Password** | ✅ | Gửi OTP; phản hồi đồng nhất tránh dò quét email tồn tại |
| **Change Password** | ✅ | Xác thực mật khẩu cũ; mật khẩu mới phải khác mật khẩu cũ |
| **Update Profile** | ✅ | Sửa thông tin, đổi email (OTP gửi tới email mới), đổi/xoá avatar |
| **Dashboard Sysadmin (Manage account)** | ✅ | Thống kê; tìm kiếm/lọc tài khoản; tạo tài khoản nội bộ; khoá/mở khoá; trang chi tiết `/admin/users/:id` (xem đủ thông tin trừ mật khẩu, sửa thông tin cá nhân + vai trò qua `PUT /api/admin/users/{id}`, có hộp thoại xác nhận); đặt lại mật khẩu cho người dùng (admin nhập lại mật khẩu của mình, hệ thống sinh mật khẩu tạm hiện 1 lần, gửi email thông báo) |
| **Submit Breaking News / Submit Complaint** | ✅ | Chung một form "Gửi thông tin"; loại phản ánh phân theo vai trò |
| **Submit Anonymously** | ✅ | Gửi ẩn danh không lưu thông tin liên hệ |
| **Attach Supporting Materials** | ✅ | Tối đa 10 tệp: ảnh, video, âm thanh, tài liệu |
| **Track Submission Status** | ✅ | Tra cứu công khai bằng mã `KB-yyyy-nnnn` + PIN (sai 5 lần khoá 15 phút); có mục "Thông tin đã gửi" cho user đăng nhập |
| **Register as Contributor** | ✅ | Trong trang Hồ sơ. Điều kiện: CITIZEN, đủ CCCD + ngày sinh + địa chỉ, ≥ 18 tuổi, uy tín ≥ 80, không có đơn chờ |
| **Track Contributor Application** | ✅ | Xem trạng thái, lịch sử, giấy tờ; rút đơn khi BTV chưa xét. BTV đã duyệt/từ chối được; **bước Phó TBT duyệt chưa làm** |
| **Manage draft (bài nghiên cứu - EXPERT)** | ✅ | Trình soạn riêng: lưu nháp (Ctrl+S), nộp bài, danh sách Bản nháp / Đã nộp (thẻ đang xem lưu trên đường dẫn `?status=`, xem bài rồi quay lại vẫn đúng thẻ) |
| **Track Article Status** | ❌ | Chưa làm |

---

## 2. Bàn làm việc Biên tập viên (`/editor`)
- **Đã làm:** Tổng quan, hàng đợi hồ sơ, xem chi tiết hồ sơ, xét đơn CTV (chuyển tiếp / từ chối).
- **Hàng đợi tin bài (`/editor/queue`):** gộp hồ sơ phản ánh + bài nghiên cứu Expert đã nộp (mã `NC-<id>`) qua API `GET /api/editor/queue?status=&type=&field=`; lọc theo loại (Khiếu nại / Tin nóng / Phóng sự điều tra / Bài nghiên cứu) và theo lĩnh vực (danh sách = chuyên mục toà soạn đang bật trong bảng `categories`, qua `GET /api/editor/queue/fields`; `ResearchEditorialService.createDefaultCategories` tự tạo 5 chuyên mục mặc định khi bảng rỗng — chức năng Admin quản lý chuyên mục **chưa làm**); có cột "Loại" và "Lĩnh vực" (bài nghiên cứu: lĩnh vực nghiên cứu; hồ sơ: chuyên mục toà soạn — thiếu thì ghi "NA", tương tự cột Khu vực). Mọi dòng có nút "Mở"; bài nghiên cứu mở `/editor/queue/research/:id` (`EditorResearchDetail`, API `GET /api/editor/research/{id}`, chỉ bài đã nộp) để đọc toàn bài.
- **Yêu cầu chỉnh sửa bài nghiên cứu:** BTV bấm "Sửa bài" → sửa tiêu đề / tóm tắt / từ khoá / nội dung, khung "Xem thay đổi" highlight chữ thêm (vàng) và gạch chữ xoá (đỏ) → "Yêu cầu chỉnh sửa" → popup xác nhận → `POST /api/editor/research/{id}/revision-requests` lưu 1 dòng `REQUEST_EDIT` trong `editorial_reviews` (bản gốc + bản đề xuất, `PENDING`) và email báo tác giả. Bài gốc giữ nguyên; mỗi bài tối đa 1 yêu cầu chờ.
- **Chuyên gia phản hồi yêu cầu chỉnh sửa:** banner trên `/research` (yêu cầu đang chờ + "Lịch sử chỉnh sửa") → trang `/research/revisions/:id` (`ExpertRevisionReview`, API `/api/research/revisions/...`): xem tab Thay đổi / Bản gốc / Bản BTV đề xuất / Bản sau chỉnh sửa, bình luận phản biện (JSON trong yêu cầu, BTV trả lời được), "Điều chỉnh đề xuất" trước khi **Đồng ý** (áp vào bài, lưu bản cuối), **Từ chối** bắt buộc lý do. Email báo BTV kết quả. Trang BTV có "Lịch sử chỉnh sửa" xem lại bản gốc và bản sau chỉnh sửa của từng lần.
- **Duyệt / Từ chối bài nghiên cứu (BTV):** "Duyệt" mở form chấm phân loại — tổng 0–10 = Lĩnh vực (0–3, tự động) + Xung đột lợi ích (0–3) + Nhắc đến / công kích cá nhân, tổ chức (0–4); 0–3 Low, 4–6 Medium, 7–10 High; công kích thiếu dẫn chứng luôn High, xung đột không khai báo ít nhất Medium (`ResearchEditorialService` + bản sao `lib/researchEditorial.js`) — rồi chuyển Phó TBT phụ trách lĩnh vực (`categories.deputy_eic_id`). "Từ chối" bắt buộc lý do, bài dừng xử lý. Kết quả lưu 1 dòng `APPROVE` / `REJECT` trong `editorial_reviews` + 2 cột `review_status`, `priority` của `research_articles`. Bị chặn khi lĩnh vực chưa có Phó TBT hoặc đang có yêu cầu chỉnh sửa chờ. Email báo Phó TBT / Chuyên gia; Chuyên gia xem kết quả ngay trong thẻ bài ở trang `/research` (khung đỏ "Bị từ chối" + lý do, hoặc khung xanh "Đã duyệt" — `ReviewResultNote`).
- **Cấu trúc code / DB (sau khi tối ưu):** backend 3 file `ResearchEditorialController` / `ResearchEditorialService` / `ResearchEditorialRepository`; frontend 3 trang + `components/research/ResearchEditorial.jsx` + `lib/researchEditorial.js`. Mọi thao tác của BTV (yêu cầu chỉnh sửa, duyệt, từ chối) lưu ở bảng thiết kế `editorial_reviews` (cột `research_article_id`, `status`; bản gốc / đề xuất / bản cuối + bình luận là JSON trong `content_snapshot`); `research_articles` chỉ thêm `review_status`, `priority`. Không còn bảng `research_revision_requests` / `research_revision_comments`. Cả nhóm cần chạy `ALTER TABLE editorial_reviews MODIFY submission_id BIGINT NULL;`.
- **Chưa làm:** màn hình Admin gán Phó TBT cho chuyên mục (hiện phải gán bằng SQL); màn hình Phó TBT duyệt bài.
- **Biên tập bài viết (`/editor/articles`):** danh sách bài nghiên cứu đã nộp kèm tình trạng biên tập theo yêu cầu chỉnh sửa gần nhất (Chưa chỉnh sửa / Chờ Chuyên gia phản hồi / Đã chỉnh sửa / Chuyên gia từ chối), số lần sửa, cập nhật gần nhất; lọc theo tình trạng, lĩnh vực, tìm theo tiêu đề (API `GET /api/editor/articles`); nút "Mở" tới `/editor/queue/research/:id`. Hiện chỉ gồm bài nghiên cứu (tin nóng / khiếu nại chưa có chức năng chỉnh sửa).
- **Giao diện chờ (Sắp có):** Sàng lọc AI, Giao nhiệm vụ, Uy tín & vi phạm.

---

## 3. Việc cần làm tiếp (Backlog / Next Focus)
- Thực hiện các nhiệm vụ đã đề ra trong `docs/project_tracking.md` phần iter 2.
- Tập trung vào nhiệm vụ được giao cho BinhNH, giữ code của nhóm, không thay đổi code của người khác.
- Những trường hợp phải thay đổi code của người khác thì phải hỏi ý kiến trước và không tự ý thay đổi.
---

## 4. Tài liệu tham khảo liên quan
- **Bảng tra chức năng → file code backend → dòng code:** `citizen_journalism/docs/backend-map.md`
- **Tài liệu đặc tả yêu cầu (SRS):** `docs/srs.md`
- **Tài liệu thiết kế hệ thống (SDS):** `docs/sds.md`
