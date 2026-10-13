/**
 * Chuẩn bị dữ liệu form trước khi gửi lên backend.
 *
 * toPayload: cắt khoảng trắng 2 đầu các ô chữ, ô chữ để TRỐNG thì gửi null.
 * TẠI SAO? Thẻ <input> luôn có giá trị chuỗi ('' khi trống), nhưng backend coi null = "không nhập":
 *   - DB lưu NULL thay vì chuỗi rỗng;
 *   - các kiểm tra định dạng (@Pattern, @Email) bỏ qua null, nên ô không bắt buộc để trống không bị báo lỗi.
 * Giá trị không phải chuỗi (true/false của checkbox...) giữ nguyên.
 *
 * Dùng ở: routes/Profile.jsx, routes/SubmitReport.jsx.
 */
export const toPayload = (values) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (typeof value !== 'string') return [key, value]
      const trimmed = value.trim()
      return [key, trimmed === '' ? null : trimmed]
    }),
  )
