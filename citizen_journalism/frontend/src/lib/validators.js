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

/**
 * Ngày hôm nay dạng "YYYY-MM-DD" theo GIỜ MÁY người dùng (giờ Việt Nam).
 * Không dùng toISOString() vì nó tính theo giờ UTC -> trước 7h sáng sẽ ra ngày hôm qua.
 * Dùng cho rule pastDate và thuộc tính max của ô chọn ngày.
 */
const pad = (number) => String(number).padStart(2, '0')

export const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Thời điểm hiện tại dạng "YYYY-MM-DDTHH:mm" theo giờ máy người dùng, đúng định dạng của ô
 * <input type="datetime-local">. Dùng cho rule notFuture và thuộc tính max của ô chọn ngày giờ.
 */
export const nowLocalIso = () => {
  const now = new Date()
  return `${todayIso()}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

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
  // Ngược lại với sameAs, ví dụ "Mật khẩu mới" phải KHÁC "Mật khẩu hiện tại".
  differentFrom: (field, message) => (value, values) => (value && value === values[field] ? message : ''),
  // Đúng n chữ số, ví dụ mã OTP 6 số.
  digits: (n, message = `Phải gồm đúng ${n} chữ số.`) => (value) =>
    new RegExp(`^\\d{${n}}$`).test(value) ? '' : message,
  // Ngày (dạng "YYYY-MM-DD" của ô type="date") phải trước hôm nay.
  pastDate: (message = 'Ngày phải ở trong quá khứ.') => (value) => (value < todayIso() ? '' : message),
  // Ngày giờ (dạng "YYYY-MM-DDTHH:mm" của ô type="datetime-local") không được sau thời điểm hiện tại.
  // So sánh chuỗi vẫn đúng thứ tự thời gian vì cùng định dạng, số có đủ 2 chữ số.
  notFuture: (message = 'Thời điểm không được ở tương lai.') => (value) => (value <= nowLocalIso() ? '' : message),
  // Khớp một biểu thức chính quy (regex), ví dụ CMND/CCCD 9 hoặc 12 số.
  pattern: (regex, message) => (value) => (regex.test(value.trim()) ? '' : message),
  // Bọc một rule để chỉ kiểm tra KHI CÓ NHẬP (ô không bắt buộc). Ví dụ: rules.optional(rules.digits(12))
  optional: (rule) => (value, values) => (isBlank(value) ? '' : rule(value, values)),
  // Bọc một rule để chỉ kiểm tra KHI điều kiện (dựa trên các ô khác) đúng.
  // Ví dụ: họ tên chỉ bắt buộc khi KHÔNG gửi ẩn danh: rules.when((v) => !v.anonymous, rules.required(...))
  when: (condition, rule) => (value, values) => (condition(values) ? rule(value, values) : ''),
}

/** Số chữ số của căn cước công dân (khớp CITIZEN_ID_REGEX ở backend util/ValidationRules.java). */
export const CITIZEN_ID_LENGTH = 12

/**
 * Bộ quy tắc cho một MẬT KHẨU MỚI (khớp với @StrongPassword ở backend).
 * Dùng chung ở Đăng ký, Đặt lại mật khẩu, Đổi mật khẩu, nên chỉ cần sửa 1 chỗ khi đổi quy tắc.
 */
export const newPasswordRules = [
  rules.required('Vui lòng nhập mật khẩu.'),
  rules.minLength(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  rules.maxLength(64, 'Mật khẩu tối đa 64 ký tự.'),
  rules.password(),
]

/** Quy tắc cho ô "Nhập lại mật khẩu": phải giống ô mật khẩu có tên `passwordField`. */
export const confirmPasswordRules = (passwordField) => [
  rules.required('Vui lòng nhập lại mật khẩu.'),
  rules.sameAs(passwordField, 'Mật khẩu nhập lại không khớp.'),
]

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
