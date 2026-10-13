import { useState } from 'react'

/**
 * Custom hook quản lý toàn bộ trạng thái của một form, dùng lại cho MỌI form trong dự án.
 *
 * TẠI SAO? Không có hook này thì mỗi trang phải tự viết: state cho từng ô, onChange, kiểm tra lỗi,
 * hiện lỗi server, trạng thái "đang gửi"... rất dài và lặp lại. Có hook thì mỗi trang chỉ cần vài dòng.
 *
 * CÁCH DÙNG (xem ví dụ thật trong routes/Register.jsx):
 *   const form = useForm({ email: '' }, validate)
 *   <TextField {...form.field('email')} />                      // tự gắn value, onChange, onBlur, error
 *   <form onSubmit={form.handleSubmit(async (values) => { await gọiAPI(values) })}>
 *
 * CƠ CHẾ HIỆN LỖI:
 *   - Lỗi phía client (do validate tính): chỉ hiện sau khi người dùng RỜI ô nhập (blur) hoặc bấm gửi,
 *     để không "mắng" người dùng khi họ còn đang gõ.
 *   - Lỗi phía server (errors trả về từ API): hiện ngay dưới đúng ô, tự biến mất khi người dùng sửa ô đó.
 *
 * @param initialValues giá trị ban đầu của các ô; kiểu boolean thì được hiểu là checkbox
 * @param validate      hàm (values) => { tênÔ: lỗi }, thường tạo bằng createValidator() trong lib/validators.js
 */
export function useForm(initialValues, validate) {
  // "Mốc" để so sánh xem người dùng đã sửa gì chưa (isDirty) và để quay lại khi bấm Huỷ (reset).
  // Ban đầu là initialValues; sau khi lưu thành công có thể đặt mốc mới bằng reset(giáTrịMới).
  const [baseline, setBaseline] = useState(initialValues)
  const [values, setValues] = useState(initialValues)          // Giá trị hiện tại của các ô
  const [touched, setTouched] = useState({})                    // Ô nào người dùng đã "chạm" (rời khỏi)
  const [serverErrors, setServerErrors] = useState({})          // Lỗi theo ô do backend trả về
  const [formError, setFormError] = useState('')                // Lỗi chung (hiện ở hộp Alert đầu form)
  const [submitting, setSubmitting] = useState(false)           // Đang gửi -> nút hiện vòng xoay, khoá bấm

  // Tính lỗi mỗi lần render (rẻ, không cần lưu state riêng).
  const clientErrors = validate(values)
  // Ưu tiên lỗi server; lỗi client chỉ hiện khi ô đã được chạm.
  const errorOf = (name) => serverErrors[name] || (touched[name] ? clientErrors[name] : '')

  /** Đổi giá trị một ô, đồng thời xoá lỗi server của ô đó và lỗi chung (người dùng đang sửa). */
  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setServerErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
    setFormError('')
  }

  /** Trả về bộ props gắn thẳng vào ô nhập: value (hoặc checked), onChange, onBlur, error. */
  const field = (name) => {
    const isCheckbox = typeof baseline[name] === 'boolean'
    return {
      name,
      [isCheckbox ? 'checked' : 'value']: values[name],
      onChange: (event) => setValue(name, isCheckbox ? event.target.checked : event.target.value),
      onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
      error: errorOf(name),
    }
  }

  /**
   * Bọc hàm gửi form. Khi bấm gửi:
   *   1. Chặn trình duyệt tải lại trang (preventDefault).
   *   2. Đánh dấu tất cả ô là "đã chạm" để hiện hết lỗi; còn lỗi thì dừng, không gọi API.
   *   3. Gọi onValid(values) (thường là gọi API). Nếu API báo lỗi thì tự đưa lỗi lên giao diện.
   */
  const handleSubmit = (onValid) => async (event) => {
    event?.preventDefault()
    setTouched(Object.fromEntries(Object.keys(baseline).map((key) => [key, true])))
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await onValid(values)
    } catch (error) {
      // error có dạng { status, message, errors } do lib/api.js chuẩn hoá
      setServerErrors(error.errors ?? {})
      setFormError(error.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setSubmitting(false) // Luôn mở khoá nút, dù thành công hay lỗi
    }
  }

  /**
   * Đưa form về trạng thái "sạch": xoá mọi lỗi và dấu đã chạm.
   *   - reset()          : quay lại giá trị mốc (dùng cho nút "Huỷ thay đổi")
   *   - reset(newValues) : đặt giá trị mốc MỚI (dùng sau khi lưu thành công)
   */
  const reset = (newValues = baseline) => {
    setBaseline(newValues)
    setValues(newValues)
    setTouched({})
    setServerErrors({})
    setFormError('')
  }

  /** true nếu người dùng đã sửa khác so với mốc (để bật/tắt nút Lưu, Huỷ). So sánh nông từng ô. */
  const isDirty = Object.keys(baseline).some((key) => values[key] !== baseline[key])

  return { values, setValue, field, errorOf, handleSubmit, submitting, formError, setFormError, reset, isDirty }
}
