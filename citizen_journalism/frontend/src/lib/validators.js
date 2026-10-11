/**
 * Bộ quy tắc kiểm tra form, viết một lần dùng cho mọi trang.
 * Mỗi rule nhận (value, allValues) và trả về chuỗi lỗi, hoặc '' nếu hợp lệ.
 * Quy tắc khớp với backend (util/ValidationRules.java).
 */
const isBlank = (value) => (typeof value === 'string' ? value.trim() === '' : !value)

export const rules = {
  required: (message = 'Trường này là bắt buộc.') => (value) => (isBlank(value) ? message : ''),
  email: (message = 'Email không đúng định dạng.') => (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : message,
  phone: (message = 'Số điện thoại gồm 10–11 chữ số và bắt đầu bằng 0.') => (value) =>
    /^0\d{9,10}$/.test(value.trim()) ? '' : message,
  password: (message = 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.') => (value) =>
    /[A-Za-z]/.test(value) && /\d/.test(value) ? '' : message,
  minLength: (min, message = `Tối thiểu ${min} ký tự.`) => (value) =>
    value.trim().length >= min ? '' : message,
  maxLength: (max, message = `Vượt quá độ dài tối đa ${max} ký tự.`) => (value) =>
    value.trim().length <= max ? '' : message,
  sameAs: (field, message) => (value, values) => (value === values[field] ? '' : message),
}

/** Tạo hàm validate(values) -> { field: message } từ một schema { field: [rule, ...] }. */
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
