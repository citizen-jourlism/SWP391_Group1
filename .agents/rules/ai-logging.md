# Bắt buộc ghi log các thay đổi source code

Mỗi khi bạn (AI) nhận được một prompt từ người dùng yêu cầu chỉnh sửa, tạo mới hoặc xóa source code, sau khi thực hiện xong, bạn **BẮT BUỘC** phải tự động cập nhật một dòng mới vào bảng trong file `ai-log.md` (nằm ở thư mục gốc của dự án).

**QUY TẮC QUAN TRỌNG:**
- Chỉ ghi log đối với các prompt có tác động trực tiếp làm thay đổi source code.
- Các thay đổi nhỏ, ít code (ví dụ: sửa 1-2 dòng import, đổi version, fix typo) có thể **BỎ QUA** không cần ghi log.
- KHÔNG ghi log cho các câu hỏi lý thuyết, đọc lỗi, giải thích code hoặc các thao tác chỉ đọc (read-only).
- Khi cập nhật `ai-log.md`, hãy dùng markdown format cho bảng.

**Định dạng bảng trong ai-log.md:**
`| Thời gian (Timestamp) | Lệnh/Prompt đã sử dụng | File/Mục source code bị thay đổi | Commit Hash (nếu có) |`
