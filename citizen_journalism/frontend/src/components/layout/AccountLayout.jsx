import SiteHeader from './SiteHeader'
import '../../assets/styles/ui.css'
import '../../assets/styles/account.css'

/**
 * KHUNG CHUNG cho các trang của người ĐÃ ĐĂNG NHẬP: Hồ sơ, Đổi mật khẩu, Gửi phản ánh (sau này: Tin đã gửi...).
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
function AccountLayout({ title, subtitle, children }) {
  return (
    <div className="account">
      <SiteHeader />

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
