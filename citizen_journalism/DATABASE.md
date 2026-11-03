# Cơ sở dữ liệu: vi phạm, khiếu nại, đơn chuyên gia

## Cách chạy trên máy mỗi người

Không cần chạy SQL. Pull code, giữ `application.properties` của máy mình (`spring.jpa.hibernate.ddl-auto=update`)
rồi chạy backend như bình thường:

- Hibernate tự thêm các cột mới (`record_kind`, `application_kind`, các cột `workflow_*`...).
- `EditorialSchemaInitializer` tự sửa những chỗ Hibernate không sửa được: cho `editorial_reviews.submission_id`
  để trống, đổi `reputation_logs.reason` và `research_articles.status` từ ENUM sang VARCHAR. Đã đúng thì bỏ qua.
- Hồ sơ và đơn CTV có từ trước (cột phân loại để trống) vẫn được tính là tin bài / đơn CTV như cũ.

`application.properties` không còn nằm trong git (mỗi máy cổng, mật khẩu DB khác nhau). Ai chưa có thì tạo từ bản
mẫu của nhóm; tài khoản admin vẫn tự tạo khi khởi động nếu chưa có.

## Dữ liệu dùng chung bảng

| Chức năng | Bảng sử dụng | Phân biệt |
|---|---|---|
| Tin bài, phản ánh | `submissions` | `record_kind=CONTENT` (hoặc để trống với dữ liệu cũ) |
| Báo cáo vi phạm | `submissions` | `record_kind=ACCOUNT_VIOLATION` |
| Khiếu nại mở khóa | `submissions` | `record_kind=ACCOUNT_APPEAL` |
| Đăng ký CTV | `contributor_applications` | `application_kind=CONTRIBUTOR` (hoặc để trống với dữ liệu cũ) |
| Đăng ký chuyên gia | `contributor_applications` | `application_kind=EXPERT` |

Các entity có bộ lọc SQL cố định (`@SQLRestriction`) để báo cáo vi phạm / khiếu nại không lẫn vào hàng đợi tin bài.

## Máy từng chạy bản cũ có 4 bảng riêng

Chỉ áp dụng cho máy đã có `user_violations`, `violation_appeals`, `expert_applications`, `bonus_point_awards`
(bản thử nghiệm trước đây). Muốn giữ dữ liệu cũ thì dừng backend, sao lưu bằng `mysqldump`, rồi:

1. `source scripts/consolidate-13-tables.sql`: chép dữ liệu sang bảng dùng chung, chạy lại không nhân bản.
2. Kiểm tra ứng dụng, sau đó `source scripts/remove-obsolete-tables.sql`: so khớp rồi mới xoá 4 bảng cũ.

Máy chưa từng có 4 bảng này thì bỏ qua phần này.
