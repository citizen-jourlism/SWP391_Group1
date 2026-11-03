# Chỉ sử dụng 13 bảng của nhánh main

Mốc đối chiếu: commit `845b89b845fd34ffb468905eb26f25797925514c` của
`citizen-jourlism/SWP391_Group1`. Database vẫn có tên `citizen_journalism`.

## Bảng được giữ

`categories`, `contributor_applications`, `editorial_reviews`, `evidences`,
`field_assignments`, `field_report_feedbacks`, `field_reports`, `otp_tokens`,
`reputation_logs`, `research_articles`, `submission_events`, `submissions`, `users`.

Đã loại bỏ `bonus_point_awards`, `expert_applications`, `user_violations`,
`violation_appeals` sau khi sao lưu và kiểm tra dữ liệu chuyển đổi.

## Chức năng được chuyển sang bảng cũ

| Chức năng | Bảng sử dụng | Phân biệt |
|---|---|---|
| Tin bài, phản ánh | `submissions` | `record_kind=CONTENT` |
| Báo cáo vi phạm | `submissions` | `record_kind=ACCOUNT_VIOLATION` |
| Khiếu nại mở khóa | `submissions` | `record_kind=ACCOUNT_APPEAL` |
| Đăng ký CTV | `contributor_applications` | `application_kind=CONTRIBUTOR` |
| Đăng ký chuyên gia | `contributor_applications` | `application_kind=EXPERT` |

Các entity có bộ lọc SQL cố định để không lẫn hàng đợi. Không thay API hoặc
trạng thái hiển thị trên giao diện. Trạng thái nghiệp vụ được chuyển đổi sang các
giá trị trạng thái sẵn có trong DB bằng JPA converters.

Thay đổi này giữ danh sách 13 bảng, **không giữ nguyên tuyệt đối mọi cột như GitHub**:
bổ sung 15 cột phân loại/thẩm định vào `submissions`, và 2 cột phân loại/ID cũ vào
`contributor_applications`. Dùng lại các cột tác giả, nội dung, người tiếp nhận,
liên kết hồ sơ và trạng thái; không lưu trùng ID người dùng như các bảng trước.
Hồ sơ chuyên gia dùng các cột chuyên môn, kinh nghiệm, giấy tờ và biên tập viên
đã có. Bằng chứng chuyên gia lưu dưới dạng JSON string trong `documents`, tách
biệt với JSON array của đơn CTV qua `application_kind`.

`workflow_legacy_id` giữ ID công khai của hồ sơ đã chuyển; khóa chính nội bộ có
thể khác. Giá trị auto-increment được nâng vượt ID cũ để hồ sơ mới không trùng ID
công khai. Có ràng buộc duy nhất theo loại hồ sơ + ID cũ và khóa ngoại người duyệt.

## Dữ liệu và sao lưu

Ngày 03/11/2026 đã chuyển đủ 8 báo cáo vi phạm và 9 khiếu nại; giữ 15 tin bài.
Hai bảng `expert_applications` và `bonus_point_awards` không có bản ghi.
Checksum của 11 bảng không tham gia chuyển đổi giữ nguyên.

Bản sao lưu đầy đủ trước khi áp dụng:
`backups/before-13-tables-final-20261103-133825.sql`.
Thư mục `backups/` bị Git bỏ qua và nằm ngoài `target/` để không bị Maven clean xóa.

## Áp dụng trên máy khác

1. Dừng backend, sao lưu toàn bộ database bằng `mysqldump`.
2. Trong MySQL client, chọn đúng database, chạy `source scripts/consolidate-13-tables.sql`.
   Script thêm cột còn thiếu và sao chép hồ sơ; có thể chạy lại mà không nhân bản.
3. Kiểm tra ứng dụng và số lượng/nội dung hồ sơ trước khi xóa bảng cũ.
4. Chạy `source scripts/remove-obsolete-tables.sql` một lần. Script so sánh các
   trường nghiệp vụ, trạng thái, ID, thời gian và ghi chú trước khi xóa. Nếu thiếu
   dữ liệu hoặc bảng điểm thưởng chưa trống, script dừng và giữ bảng cũ.

Các script dành cho cấu trúc DB trước thay đổi của nhánh hiện tại; cần thử trên
bản sao nếu máy khác có cấu trúc khác. Có thể hoàn tác bằng bản dump và phiên bản
code trước thay đổi, khi đã dừng backend.

Backend vẫn dùng `ddl-auto=validate`, không tự tạo/sửa bảng hoặc chạy migration.
Tự tạo admin và tự chuẩn hóa điểm lúc khởi động mặc định bị tắt.

## Kiểm tra

- `./mvnw.cmd test`: các service dùng mock; kiểm tra Spring Boot chỉ đọc DB thật.
- Kiểm tra ghi chỉ chạy khi `WORKFLOW_WRITE_TEST_DB=citizen_journalism_verify_13`
  và `SPRING_DATASOURCE_URL` trỏ đến đúng DB kiểm thử đó. Mỗi test rollback;
  code còn kiểm tra `SELECT DATABASE()` trước khi tạo dữ liệu.
- 32 test đã đạt trên bản sao sau khi xóa 4 bảng: duyệt bài, uy tín, vi phạm,
  khiếu nại, đơn chuyên gia, lưu/cập nhật thực tế, giữ ID cũ và tách hàng đợi.
- `npm run build` thành công; `npm run lint` có 7 cảnh báo sẵn có.
- Chưa kiểm thử toàn bộ thao tác trên trình duyệt.
