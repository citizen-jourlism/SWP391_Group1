import { useId, useState } from 'react'
import Icon from './Icon'

/**
 * Ô nhập liệu chuẩn của dự án: nhãn + icon + ô nhập + thông báo lỗi/gợi ý bên dưới.
 * Dùng cho mọi form (đăng ký, đăng nhập, khiếu nại, hồ sơ...), CSS nằm trong assets/styles/ui.css (mục "Ô nhập liệu").
 *
 * CÁCH DÙNG (thường kết hợp useForm):
 *   <TextField label="Email" icon="mail" type="email" required {...form.field('email')} />
 *
 * Props chính:
 *   - label, icon, required : nhãn, tên icon (xem Icon.jsx), dấu * bắt buộc
 *   - error / hint          : lỗi (chữ đỏ) hoặc gợi ý (chữ xám) hiện dưới ô
 *   - type="password"       : tự có nút con mắt để hiện/ẩn mật khẩu
 *   - multiline, rows       : dùng ô nhiều dòng (<textarea>) thay cho <input>, ví dụ "Nội dung chi tiết"
 *   - counter               : số ký tự tối đa -> hiện bộ đếm "120/300" góc phải dưới ô (đỏ khi vượt)
 *   - children              : nội dung chèn ngay dưới ô (ví dụ thanh đo độ mạnh mật khẩu)
 *   - ...inputProps         : mọi prop còn lại (value, onChange, placeholder...) truyền thẳng vào thẻ <input>/<textarea>
 */
function TextField({
  label,
  icon,
  error,
  hint,
  type = 'text',
  required,
  multiline = false,
  rows = 5,
  counter,
  children,
  ...inputProps
}) {
  // useId: tạo id duy nhất để nối <label htmlFor> với <input id>.
  // Nhờ vậy bấm vào nhãn thì con trỏ nhảy vào ô, và trình đọc màn hình đọc đúng tên ô.
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const messageId = `${id}-message`
  const length = String(inputProps.value ?? '').trim().length
  // Thẻ dùng để nhập: <textarea> (nhiều dòng) hoặc <input>. Viết hoa chữ đầu để JSX hiểu là biến chứa tên thẻ.
  const Control = multiline ? 'textarea' : 'input'
  const typeProps = multiline ? { rows } : { type: isPassword && showPassword ? 'text' : type } // Đang bật "hiện mật khẩu" thì đổi type sang text

  return (
    // Có lỗi thì thêm class field--error để CSS tô viền đỏ
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span className="field__required" aria-hidden="true">*</span>}
      </label>

      <div className="field__control">
        {icon && <Icon name={icon} className="field__icon" />}
        <Control
          id={id}
          className={`field__input ${multiline ? 'field__textarea' : ''} ${icon ? 'has-icon' : ''} ${isPassword ? 'has-action' : ''}`}
          {...typeProps}
          aria-invalid={Boolean(error)}                              // Báo cho trình đọc màn hình biết ô đang lỗi
          aria-describedby={error || hint ? messageId : undefined}   // Liên kết ô với dòng lỗi/gợi ý bên dưới
          required={required}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button" // type="button" để bấm không bị tính là gửi form
            className="field__action"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>

      {children}

      {(error || hint || counter) && (
        <div className="field__meta">
          {(error || hint) && (
            // role="alert": trình đọc màn hình sẽ đọc lỗi ngay khi nó xuất hiện
            <p id={messageId} className={error ? 'field__error' : 'field__hint'} role={error ? 'alert' : undefined}>
              {error && <Icon name="alertCircle" size={14} />}
              {error || hint}
            </p>
          )}
          {counter && (
            <span className={`field__counter ${length > counter ? 'is-over' : ''}`} aria-hidden="true">
              {length}/{counter}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default TextField
