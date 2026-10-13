import { Link } from 'react-router-dom'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import UserMenu from './UserMenu'
import '../../assets/styles/ui.css'
import '../../assets/styles/account.css'

/**
 * KHUNG CHUNG cho các trang của người ĐÃ ĐĂNG NHẬP (hiện có: Hồ sơ; sau này: Tin đã gửi, Theo dõi xử lý...).
 * CSS: assets/styles/account.css.
 *
 * BỐ CỤC:
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ [Logo] TIN NÓNG DÂN SINH            Trang chủ   [Menu TK] │  <- thanh đầu trang (nền navy)
 *   ├───────────────────────────────────────────────────────────┤
 *   │ Tiêu đề trang + mô tả                                     │
 *   │ {children} = nội dung riêng của từng trang                │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Khác AuthLayout (dành cho đăng nhập/đăng ký, có panel giới thiệu): khung này giống một trang ứng dụng bình thường.
 */
function AccountLayout({ title, subtitle, children }) {
  return (
    <div className="account">
      <header className="account__topbar">
        <div className="account__container account__topbar-inner">
          <Link to="/" className="account__brand">
            <Logo size={38} />
            <span>
              <strong>TIN NÓNG DÂN SINH</strong>
              <small>Tiếp nhận thông tin &amp; chăm sóc người dân</small>
            </span>
          </Link>
          <nav className="account__nav" aria-label="Điều hướng tài khoản">
            <Link to="/" className="account__nav-link">
              <Icon name="home" size={16} />
              <span>Trang chủ</span>
            </Link>
            <UserMenu />
          </nav>
        </div>
      </header>

      <main className="account__container account__main">
        <header className="account__heading">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  )
}

export default AccountLayout
