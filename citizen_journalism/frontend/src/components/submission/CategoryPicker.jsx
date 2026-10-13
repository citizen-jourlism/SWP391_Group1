import Icon from '../ui/Icon'
import { REPORT_CATEGORIES } from '../../lib/submission'

/**
 * Ô chọn LOẠI PHẢN ÁNH dạng "thẻ" (SRS 4.1.1: Category - radio group, bắt buộc).
 * Dùng ở routes/SubmitReport.jsx. CSS: assets/styles/submit.css (mục "Chọn loại phản ánh").
 *
 * KỸ THUẬT: mỗi thẻ là một <label> bọc thẻ <input type="radio"> thật (ẩn đi bằng CSS).
 *   - Bấm vào bất kỳ đâu trên thẻ = chọn radio đó.
 *   - Dùng phím mũi tên để chuyển lựa chọn, trình đọc màn hình đọc đúng "1 trong 4" (vì cùng name).
 *
 * Props: value, onChange (nhận sự kiện của input như ô nhập thường -> dùng thẳng form.field('category')), error, name.
 */
function CategoryPicker({ name, value, onChange, error }) {
  return (
    <fieldset className="category-picker">
      <legend className="sr-only">Loại phản ánh</legend>
      {REPORT_CATEGORIES.map((item) => (
        <label key={item.value} className={`category-card ${value === item.value ? 'is-selected' : ''}`}>
          <input
            type="radio"
            name={name}
            value={item.value}
            checked={value === item.value}
            onChange={onChange}
            className="category-card__input"
          />
          <span className={`category-card__icon category-card__icon--${item.slug}`}>
            <Icon name={item.icon} size={20} />
          </span>
          <span className="category-card__text">
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </span>
          <span className="category-card__check" aria-hidden="true">
            <Icon name="check" size={12} strokeWidth={3} />
          </span>
        </label>
      ))}
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default CategoryPicker
