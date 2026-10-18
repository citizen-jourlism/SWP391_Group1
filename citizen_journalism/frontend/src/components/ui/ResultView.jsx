import Icon from './Icon'

const ICONS = { success: 'checkCircle', muted: 'info' }

/**
 * Màn hình KẾT QUẢ đặt trong thẻ của AuthLayout: icon tròn lớn + đoạn mô tả + các nút hành động.
 * Dùng ở: xác thực OTP thành công, đặt lại / đổi mật khẩu thành công, trang không tìm thấy...
 * CSS: các class .result* trong assets/styles/ui.css.
 *
 * Props:
 *   - tone    : 'success' (xanh lá, dấu tích) | 'muted' (xám, chữ i)
 *   - text    : đoạn mô tả (không bắt buộc)
 *   - children: các nút hành động (Button), xếp dọc, rộng hết khung
 */
function ResultView({ tone = 'success', text, children }) {
  return (
    <div className="result">
      <div className={`result__icon result__icon--${tone}`}>
        <Icon name={ICONS[tone]} size={tone === 'success' ? 44 : 40} strokeWidth={1.8} />
      </div>
      {text && <p className="result__text">{text}</p>}
      {children && <div className="result__actions">{children}</div>}
    </div>
  )
}

export default ResultView
