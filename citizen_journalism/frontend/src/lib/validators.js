/**
 * Bộ quy tắc kiểm tra form phía trình duyệt, viết 1 lần dùng cho mọi trang
 * (Đăng ký, Đăng nhập, Gửi khiếu nại, Hồ sơ...).
 *
 * TẠI SAO kiểm tra ở frontend khi backend cũng kiểm tra?
 *   - Frontend: báo lỗi NGAY khi người dùng gõ sai, không phải chờ gửi lên server -> trải nghiệm tốt.
 *   - Backend: kiểm tra lại cho chắc, vì người xấu có thể bỏ qua giao diện và gọi API trực tiếp.
 * Quy tắc ở đây khớp với backend (util/ValidationRules.java), sửa bên này thì nhớ sửa cả bên kia.
 *
 * Mỗi rule là một hàm nhận (value, allValues) và trả về chuỗi lỗi, hoặc '' nếu hợp lệ.
 * Các rule được viết dạng "hàm trả về hàm" để truyền được thông báo tuỳ chỉnh:
 *   rules.required('Vui lòng nhập email.')  ->  (value) => value rỗng ? 'Vui lòng nhập email.' : ''
 */
const isBlank = (value) => (typeof value === 'string' ? value.trim() === '' : !value) // Checkbox: false = "trống"

export const rules = {
  required: (message = 'Trường này là bắt buộc.') => (value) => (isBlank(value) ? message : ''),
  email: (message = 'Email không đúng định dạng.') => (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : message, // dạng: chữ@chữ.chữ
  phone: (message = 'Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0.') => (value) =>
    /^0\d{9,10}$/.test(value.trim()) ? '' : message,
  password: (message = 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.') => (value) =>
    /[A-Za-z]/.test(value) && /\d/.test(value) ? '' : message,
  minLength: (min, message = `Tối thiểu ${min} ký tự.`) => (value) =>
    value.trim().length >= min ? '' : message,
  maxLength: (max, message = `Vượt quá độ dài tối đa ${max} ký tự.`) => (value) =>
    value.trim().length <= max ? '' : message,
  // So sánh với một ô khác trong form, ví dụ "Nhập lại mật khẩu" phải giống "Mật khẩu".
  sameAs: (field, message) => (value, values) => (value === values[field] ? '' : message),
}

/**
 * Biến một "schema" (danh sách rule cho từng ô) thành hàm validate(values) -> { tênÔ: thôngBáoLỗi }.
 * Với mỗi ô, chạy lần lượt các rule và DỪNG ở lỗi đầu tiên (mỗi ô chỉ hiện 1 lỗi cho dễ đọc).
 *
 * Ví dụ:
 *   const validate = createValidator({ email: [rules.required('Nhập email'), rules.email()] })
 *   validate({ email: '' })      // -> { email: 'Nhập email' }
 *   validate({ email: 'a@b.c' }) // -> {}
 */
export function createValidator(schema) {
  return (values) => {
    const errors = {}
    for (const [field, fieldRules] of Object.entries(schema)) {
      for (const rule of fieldRules) {
        const message = rule(values[field] ?? '', values)
        if (message) {
          errors[field] = message
          break
        }
      }
    }
    return errors
  }
}
