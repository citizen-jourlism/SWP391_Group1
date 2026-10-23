/**
 * Chuẩn bị dữ liệu trước khi gửi lên backend (dùng trong các file services/ và các form).
 */

/**
 * toPayload: cắt khoảng trắng 2 đầu các ô chữ, ô chữ để TRỐNG thì gửi null.
 * TẠI SAO? Thẻ <input> luôn có giá trị chuỗi ('' khi trống), nhưng backend coi null = "không nhập":
 *   - DB lưu NULL thay vì chuỗi rỗng;
 *   - các kiểm tra định dạng (@Pattern, @Email) bỏ qua null, nên ô không bắt buộc để trống không bị báo lỗi.
 * Giá trị không phải chuỗi (true/false của checkbox...) giữ nguyên.
 *
 * Dùng ở: routes/Profile.jsx, components/submission/ReportForm.jsx, components/contributor/ContributorApplyForm.jsx,
 * components/admin/CreateUserDialog.jsx.
 */
export const toPayload = (values) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (typeof value !== 'string') return [key, value]
      const trimmed = value.trim()
      return [key, trimmed === '' ? null : trimmed]
    }),
  )

/**
 * Bỏ các tham số lọc đang để trống trước khi gắn lên đường dẫn,
 * ví dụ { status: 'PENDING', category: '', page: 0 } -> ?status=PENDING&page=0 (không có "category=").
 * Backend hiểu "không có tham số" = không lọc. Dùng ở adminService, editorService.
 */
export const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))

/**
 * Đóng gói dữ liệu + tệp thành FormData để gửi kiểu multipart (form có tải tệp lên).
 *   - Phần "data": object chữ, gửi dạng JSON (backend nhận bằng @RequestPart("data")).
 *   - Phần "files": từng tệp (backend nhận bằng @RequestPart("files")).
 * Dùng ở submissionService, contributorService, researchService.
 */
export const toMultipart = (data, files = []) => {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  files.forEach((file) => formData.append('files', file))
  return formData
}
