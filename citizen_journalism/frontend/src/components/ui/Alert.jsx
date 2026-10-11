import Icon from './Icon'

// Mỗi loại thông báo dùng một icon riêng.
const ICONS = { error: 'alertCircle', success: 'checkCircle', info: 'info', warning: 'alertCircle' }

/**
 * Hộp thông báo màu (CSS: assets/styles/ui.css, mục "Thông báo").
 *   type = 'error' (đỏ) | 'success' (xanh lá) | 'info' (xanh dương) | 'warning' (cam)
 *
 * Không có nội dung thì không hiện gì, nên có thể viết thẳng <Alert type="error">{form.formError}</Alert>
 * mà không cần kiểm tra if.
 */
function Alert({ type = 'info', title, children }) {
  if (!title && !children) return null
  return (
    // role="alert" (lỗi) / "status" (thông tin): trình đọc màn hình tự đọc khi hộp xuất hiện
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[type]} size={18} className="alert__icon" />
      <div>
        {title && <strong className="alert__title">{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  )
}

export default Alert
