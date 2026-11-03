import Icon from './Icon'

const ICONS = { success: 'checkCircle', muted: 'info', danger: 'x' }

/**
 * Màn hình KẾT QUẢ đặt trong thẻ của AuthLayout: icon tròn lớn + đoạn mô tả + các nút hành động.
 * Dùng ở: xác thực OTP thành công, đặt lại / đổi mật khẩu thành công, trang không tìm thấy...
 * CSS: các class .result* trong assets/styles/ui.css.
 *
 * Props:
 *   - tone    : 'success' (xanh lá, dấu tích) | 'muted' (xám, chữ i) | 'danger' (đỏ, dấu X)
 *   - text    : đoạn mô tả (không bắt buộc)
 *   - children: các nút hành động (Button), xếp dọc, rộng hết khung
 *   - compact : bản thu gọn đặt trong 1 thẻ của màn làm việc: icon nhỏ bên trái, mô tả, các nút nằm ngang bên phải
 */
function ResultView({ tone = 'success', text, compact = false, children }) {
  return (
    <div className={`result ${compact ? 'result--compact' : ''}`}>
      <div className={`result__icon result__icon--${tone}`}>
        <Icon name={ICONS[tone]} size={compact ? 22 : tone === 'success' ? 44 : 40} strokeWidth={compact ? 2 : 1.8} />
      </div>
      {text && <p className="result__text">{text}</p>}
      {children && <div className="result__actions">{children}</div>}
    </div>
  )
}

export default ResultView
