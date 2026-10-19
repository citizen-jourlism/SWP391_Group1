/**
 * Nhãn nhỏ bo tròn có màu, ví dụ vai trò "Biên tập viên", trạng thái "Đã khoá".
 * tone: 'neutral' | 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'dark' (CSS: .badge--<tone> trong ui.css)
 * Màu theo vai trò / trạng thái lấy từ lib/roles.js (ROLE_TONES, STATUS_INFO).
 */
function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export default Badge
