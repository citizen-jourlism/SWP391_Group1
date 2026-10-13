import { Link } from 'react-router-dom'
import Icon from '../ui/Icon'
import SiteHeader from './SiteHeader'
import '../../assets/styles/ui.css'
import '../../assets/styles/account.css'

/**
 * KHUNG CHUNG cho các trang nội dung (không phải trang chủ, không phải đăng nhập/đăng ký):
 * Hồ sơ, Đổi mật khẩu, Gửi phản ánh, Hồ sơ đã gửi, Tra cứu hồ sơ (trang này không cần đăng nhập).
 * CSS: assets/styles/account.css.
 *
 * BỐ CỤC:
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ SiteHeader (giống hệt trang chủ: dải thông tin + menu)    │  <- components/layout/SiteHeader.jsx
 *   ├───────────────────────────────────────────────────────────┤
 *   │ Tiêu đề trang + mô tả                                     │
 *   │ {children} = nội dung riêng của từng trang                │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Dùng chung SiteHeader với trang chủ -> người dùng luôn thấy cùng một thanh điều hướng ở mọi trang.
 * Khác AuthLayout (dành cho đăng nhập/đăng ký, có panel giới thiệu): khung này giống một trang ứng dụng bình thường.
 */
function AccountLayout({ title, subtitle, backLink, children }) {
  return (
    <div className="account">
      <SiteHeader />

      <main className="account__container account__main">
        <header className="account__heading">
          {/* backLink (không bắt buộc) = { to, label }: link "← Quay lại" phía trên tiêu đề, ví dụ ở trang chi tiết hồ sơ */}
          {backLink && (
            <Link to={backLink.to} className="account__back">
              <Icon name="arrowLeft" size={16} />
              {backLink.label}
            </Link>
          )}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  )
}

export default AccountLayout
