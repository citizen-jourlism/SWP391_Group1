import { useId, useState } from 'react'
import Icon from './Icon'

/**
 * Ô nhập liệu có nhãn, icon, thông báo lỗi/gợi ý.
 * Với type="password" tự có nút hiện/ẩn mật khẩu.
 */
function TextField({ label, icon, error, hint, type = 'text', required, children, ...inputProps }) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const messageId = `${id}-message`

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && <span className="field__required" aria-hidden="true">*</span>}
      </label>

      <div className="field__control">
        {icon && <Icon name={icon} className="field__icon" />}
        <input
          id={id}
          className={`field__input ${icon ? 'has-icon' : ''} ${isPassword ? 'has-action' : ''}`}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          required={required}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="field__action"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>

      {children}

      {(error || hint) && (
        <p id={messageId} className={error ? 'field__error' : 'field__hint'} role={error ? 'alert' : undefined}>
          {error && <Icon name="alertCircle" size={14} />}
          {error || hint}
        </p>
      )}
    </div>
  )
}

export default TextField
