import Icon from '../ui/Icon'

/**
 * Thẻ số liệu trên trang Tổng quan admin: icon màu + con số lớn + tên + dòng ghi chú nhỏ.
 * tone: 'blue' | 'green' | 'orange' | 'red' (màu icon, CSS .stat-card--<tone> trong admin.css)
 */
function StatCard({ icon, label, value, hint, tone = 'blue' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <span className="stat-card__label">{label}</span>
        {/* toLocaleString('vi-VN'): 1234 -> "1.234" */}
        <strong className="stat-card__value">{Number(value ?? 0).toLocaleString('vi-VN')}</strong>
        {hint && <span className="stat-card__hint">{hint}</span>}
      </div>
    </article>
  )
}

export default StatCard
