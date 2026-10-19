import { useId } from 'react'
import Icon from './Icon'

/**
 * Ô chọn (dropdown) có nhãn và báo lỗi, giao diện giống TextField (dùng chung class .field* trong ui.css).
 * Dùng ở: form tạo tài khoản và bộ lọc của trang admin.
 *
 * Props:
 *   - options : [{ value, label }]
 *   - placeholder : dòng đầu tiên có value '' (ví dụ "Tất cả vai trò"); bỏ trống thì không có dòng này
 *   - label (không bắt buộc), error, ...selectProps (value, onChange...) truyền thẳng vào thẻ <select>
 */
function SelectField({ label, error, options, placeholder, required, className = '', ...selectProps }) {
  const id = useId()
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <span className="field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="field__control">
        <select id={id} className="field__input field__select" aria-invalid={Boolean(error)} {...selectProps}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} className="field__select-arrow" />
      </div>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export default SelectField
