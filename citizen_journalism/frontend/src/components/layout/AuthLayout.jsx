import { Link } from 'react-router-dom'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import '../../assets/styles/ui.css'
import '../../assets/styles/auth.css'

// Nội dung 3 thẻ giới thiệu ở panel bên trái. Muốn đổi chữ/icon thì sửa ở đây.
const HIGHLIGHTS = [
  { icon: 'zap', title: 'Gửi tin nóng 24/7', text: 'Báo sự cố, tai nạn, vấn đề dân sinh bất cứ lúc nào.' },
  { icon: 'shield', title: 'Bảo mật danh tính', text: 'Cho phép gửi ẩn danh, thông tin được mã hoá an toàn.' },
  { icon: 'activity', title: 'Theo dõi tiến độ', text: 'Biết tin của bạn đang được xử lý tới bước nào.' },
]

/**
 * KHUNG CHUNG (layout) cho các trang tài khoản: Đăng ký, Xác thực OTP, và sau này Đăng nhập, Quên mật khẩu.
 * CSS: assets/styles/auth.css.
 *
 * BỐ CỤC:
 *   ┌──────────────────────┬────────────────────────────┐
 *   │ Panel giới thiệu     │  ← Về trang chủ            │
 *   │ (logo, khẩu hiệu,    │  ┌──────────────────────┐  │
 *   │  3 điểm nổi bật)     │  │ badge, title, subtitle│  │
 *   │                      │  │ {children} = form     │  │
 *   │                      │  │ footer                │  │
 *   └──────────────────────┴──┴──────────────────────┴──┘
 *   Màn hình hẹp (< 960px, điện thoại/tablet): ẩn panel trái, hiện logo nhỏ phía trên.
 *
 * TẠI SAO? Các trang tài khoản dùng chung một khung. Viết 1 lần, mỗi trang chỉ truyền phần riêng:
 *   <AuthLayout title="Tạo tài khoản mới" subtitle="..." badge="..." footer={...}> form </AuthLayout>
 */
function AuthLayout({ title, subtitle, badge, children, footer }) {
  return (
    <div className="auth">
      {/* ===== Panel giới thiệu bên trái ===== */}
      <aside className="auth__aside">
        <Link to="/" className="auth__brand">
          <Logo size={42} />
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

      {/* ===== Khu vực form bên phải ===== */}
      <main className="auth__main">
        <div className="auth__topline">
          {/* Logo nhỏ (auth__brand--compact) chỉ hiện trên màn hình hẹp, khi panel trái bị ẩn */}
          <Link to="/" className="auth__back">
            <Icon name="arrowLeft" size={16} />
            Về trang chủ
          </Link>
          <Link to="/" className="auth__brand auth__brand--compact">
            <Logo size={32} />
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
