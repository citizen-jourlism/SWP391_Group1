import { useId } from 'react'
import Icon from './Icon'

/**
 * Ô tick (checkbox) có giao diện tuỳ chỉnh (CSS: assets/styles/ui.css, mục "Checkbox").
 *
 * KỸ THUẬT: thẻ <input type="checkbox"> thật vẫn tồn tại nhưng bị ẩn đi (opacity 0),
 * còn ô vuông mình tự vẽ (.checkbox__box) đổi màu theo trạng thái checked bằng CSS.
 * TẠI SAO? Checkbox mặc định của trình duyệt khó chỉnh cho đẹp, nhưng vẫn cần thẻ thật
 * để bàn phím (phím Space) và trình đọc màn hình hoạt động đúng.
 *
 * CÁCH DÙNG: <Checkbox label="Tôi đồng ý..." {...form.field('agreeTerms')} />
 */
function Checkbox({ label, error, ...inputProps }) {
  const id = useId()
  return (
    <div className={`checkbox ${error ? 'checkbox--error' : ''}`}>
      <input id={id} type="checkbox" className="checkbox__input" aria-invalid={Boolean(error)} {...inputProps} />
      {/* Bấm vào bất kỳ đâu trong label (ô vuông hoặc chữ) đều tick/bỏ tick được nhờ htmlFor */}
      <label htmlFor={id} className="checkbox__label">
        <span className="checkbox__box" aria-hidden="true">
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
        <span>{label}</span>
      </label>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export default Checkbox
