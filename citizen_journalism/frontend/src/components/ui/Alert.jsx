import Icon from './Icon'

const ICONS = { error: 'alertCircle', success: 'checkCircle', info: 'info', warning: 'alertCircle' }

/** Hộp thông báo: type = 'error' | 'success' | 'info' | 'warning'. Không render nếu không có nội dung. */
function Alert({ type = 'info', title, children }) {
  if (!title && !children) return null
  return (
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
