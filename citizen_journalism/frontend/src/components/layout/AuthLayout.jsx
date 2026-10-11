import { Link } from 'react-router-dom'
import Icon from '../ui/Icon'
import '../../assets/styles/ui.css'
import '../../assets/styles/auth.css'

const HIGHLIGHTS = [
  { icon: 'zap', title: 'Gửi tin nóng 24/7', text: 'Báo sự cố, tai nạn, vấn đề dân sinh bất cứ lúc nào.' },
  { icon: 'shield', title: 'Bảo mật danh tính', text: 'Cho phép gửi ẩn danh, thông tin được mã hoá an toàn.' },
  { icon: 'activity', title: 'Theo dõi tiến độ', text: 'Biết tin của bạn đang được xử lý tới bước nào.' },
]

/**
 * Khung chung cho các trang tài khoản (Đăng ký, Xác thực OTP, Đăng nhập, Quên mật khẩu...):
 * bên trái là panel giới thiệu, bên phải là thẻ chứa form.
 */
function AuthLayout({ title, subtitle, badge, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <Link to="/" className="auth__brand">
          <span className="auth__brand-icon">✦</span>
          <span>
            <strong>TIN NÓNG DÂN SINH</strong>
            <small>Tiếp nhận thông tin &amp; chăm sóc người dân</small>
          </span>
        </Link>

        <div className="auth__pitch">
          <span className="auth__eyebrow">Kênh tiếp nhận chính thức của toà soạn</span>
          <h2>
            Mỗi người dân là
            <br />
            <span>một &quot;mắt thần&quot;</span> của cộng đồng
          </h2>
          <ul className="auth__highlights">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <span className="auth__highlight-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth__aside-foot">Đường dây nóng 1900 6668 · Tiếp nhận 24/7</p>
      </aside>

      <main className="auth__main">
        <div className="auth__topline">
          <Link to="/" className="auth__back">
            <Icon name="arrowLeft" size={16} />
            Về trang chủ
          </Link>
          <Link to="/" className="auth__brand auth__brand--compact">
            <span className="auth__brand-icon">✦</span>
            <strong>TIN NÓNG DÂN SINH</strong>
          </Link>
        </div>

        <section className="auth__card">
          {badge && <div className="auth__badge">{badge}</div>}
          <header className="auth__header">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
          {children}
          {footer && <footer className="auth__footer">{footer}</footer>}
        </section>
      </main>
    </div>
  )
}

export default AuthLayout
