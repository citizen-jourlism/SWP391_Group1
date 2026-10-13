import Icon from './Icon'

/**
 * Ô CHỌN NHIỀU dạng "chip" (các nút bo tròn bấm để bật / tắt), ví dụ chọn lĩnh vực khi đăng ký Cộng tác viên.
 * CSS: assets/styles/ui.css (mục "ChipSelect").
 *
 * Props:
 *   - label, required, error, hint : giống TextField
 *   - options : mảng chuỗi (giá trị cũng là chữ hiển thị)
 *   - value   : mảng các giá trị đang chọn
 *   - onChange(mảngMới)
 *   - max     : chọn tối đa bao nhiêu (đủ rồi thì các chip chưa chọn bị khoá)
 *
 * aria-pressed: báo cho trình đọc màn hình biết nút đang "bật" hay "tắt".
 */
function ChipSelect({ label, required, error, hint, options, value, onChange, max }) {
  const full = max != null && value.length >= max

  const toggle = (option) =>
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <span className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true">*</span>}
      </span>
      <div className="chip-select" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = value.includes(option)
          return (
            <button
              key={option}
              type="button"
              className={`chip ${selected ? 'is-selected' : ''}`}
              aria-pressed={selected}
              disabled={!selected && full}
              onClick={() => toggle(option)}
            >
              {selected && <Icon name="check" size={13} strokeWidth={3} />}
              {option}
            </button>
          )
        })}
      </div>
      {(error || hint) && (
        <p className={error ? 'field__error' : 'field__hint'} role={error ? 'alert' : undefined}>
          {error && <Icon name="alertCircle" size={14} />}
          {error || hint}
        </p>
      )}
    </div>
  )
}

export default ChipSelect
