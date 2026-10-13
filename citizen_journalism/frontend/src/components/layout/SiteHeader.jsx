import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { SUBMITTER_ROLES } from '../../lib/roles'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import UserMenu from './UserMenu'
import '../../assets/styles/site-header.css'

/**
 * THANH ĐẦU TRANG DÙNG CHUNG cho trang chủ (routes/Homepage.jsx) và các trang người dùng (AccountLayout).
 * CSS: assets/styles/site-header.css. Khu quản trị có khung riêng (AdminLayout), không dùng thanh này.
 *
 * BỐ CỤC:
 *   ┌──────────────────────────────────────────────────────────────────────────────┐
 *   │ ● Đang trực 24/7 · Thứ Hai, 13/10/2026         ☎ 1900 6668 · ✉ email toà soạn │ <- dải thông tin (đỏ)
 *   ├──────────────────────────────────────────────────────────────────────────────┤
 *   │ [Logo] TIN NÓNG DÂN SINH   Trang chủ  Tra cứu hồ sơ ...      [Gửi thông tin] [TK] │ <- thanh chính (navy, dính trên cùng)
 *   └──────────────────────────────────────────────────────────────────────────────┘
 *
 * KHÁC NHAU TRƯỚC / SAU KHI ĐĂNG NHẬP (phần bên phải thanh chính):
 *   - Chưa đăng nhập : "Đăng nhập" + "Đăng ký" (nút cam).
 *   - Người dân / CTV / chuyên gia : nút cam "Gửi thông tin" (MỘT nút chung cho tin nóng, khiếu nại...;
 *                                    chọn loại ngay trong form) + menu tài khoản.
 *   - Admin          : nút "Trang quản trị" + menu tài khoản.
 *   - Nhân sự toà soạn khác: chỉ menu tài khoản (chưa có bàn làm việc riêng).
 * Màn hình vừa (≤ 1360px): menu bỏ icon, menu tài khoản chỉ còn ảnh đại diện.
 * Màn hình hẹp (≤ 1100px): menu điều hướng thu vào nút ☰, bấm để xổ xuống.
 */

/**
 * Các mục điều hướng. hash = cuộn tới một khối của trang chủ (xem id trong Homepage.jsx + ScrollToTop.jsx).
 * Nút gửi thông tin KHÔNG nằm ở đây mà là nút cam bên phải (primaryAction) cho nổi bật.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', icon: 'home', end: true },
  { to: '/track', label: 'Tra cứu hồ sơ', icon: 'search' },
  { to: '/#gioi-thieu', label: 'Giới thiệu', icon: 'info', hash: true },
  { to: '/#lien-he', label: 'Liên hệ', icon: 'phone', hash: true },
]

/** "Thứ Hai, 13/10/2026" — ngày hiện tại theo kiểu Việt Nam, viết hoa chữ đầu. */
const todayLabel = () => {
  const text = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function SiteHeader() {
  const { user, status } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false) // Menu ☰ trên điện thoại

  // Chuyển trang (hoặc bấm mục có #) thì tự đóng menu ☰.
  // Đặt state trong lúc render thay vì useEffect: React khuyến nghị cách này khi state phụ thuộc giá trị khác.
  const [lastLocation, setLastLocation] = useState(location)
  if (lastLocation !== location) {
    setLastLocation(location)
    setMenuOpen(false)
  }

  // Nhấn Esc thì đóng menu ☰
  useEffect(() => {
    if (!menuOpen) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const ready = status === 'ready' // Đang kiểm tra token lúc mở web -> chưa vẽ nút, tránh nút "Đăng nhập" nháy lên rồi biến mất

  /** Nút hành động chính, đổi theo trạng thái đăng nhập / vai trò. Dùng cả ở thanh chính lẫn menu ☰. */
  const primaryAction = !ready ? null : !user ? (
    <Link to="/register" className="site-header__cta">
      <Icon name="user" size={16} />
      Đăng ký
    </Link>
  ) : SUBMITTER_ROLES.includes(user.role) ? (
    <Link to="/submit" className="site-header__cta">
      <Icon name="send" size={16} />
      Gửi thông tin
    </Link>
  ) : user.role === 'SYSTEM_ADMIN' ? (
    <Link to="/admin" className="site-header__cta site-header__cta--dark">
      <Icon name="activity" size={16} />
      Trang quản trị
    </Link>
  ) : null

  return (
    <header className="site-header">
      {/* ----- Dải thông tin ----- */}
      <div className="site-header__strip">
        <div className="site-header__container site-header__strip-inner">
          <span className="site-header__live">
            <span className="site-header__pulse" aria-hidden="true" />
            Đang trực tiếp nhận 24/7
            <span className="site-header__sep" aria-hidden="true">·</span>
            <span className="site-header__date">{todayLabel()}</span>
          </span>
          <span className="site-header__contacts">
            <a href="tel:19006668">
              <Icon name="phone" size={13} />
              <span className="site-header__hotline-label">Đường dây nóng</span> <b>1900 6668</b>
            </a>
            <a href="mailto:toasoan@tinnongdansinh.vn" className="site-header__mail">
              <Icon name="mail" size={13} />
              toasoan@tinnongdansinh.vn
            </a>
          </span>
        </div>
      </div>

      {/* ----- Thanh chính ----- */}
      <div className="site-header__bar">
        <div className="site-header__container site-header__bar-inner">
          <Link to="/" className="site-header__brand">
            <Logo size={40} />
            <span>
              <strong>TIN NÓNG DÂN SINH</strong>
              <small>Kênh tiếp nhận phản ánh của người dân</small>
            </span>
          </Link>

          {/* Menu điều hướng: hàng ngang trên máy tính, xổ xuống khi bấm ☰ trên điện thoại */}
          <nav className={`site-header__nav ${menuOpen ? 'is-open' : ''}`} aria-label="Điều hướng chính">
            {NAV_ITEMS.map((item) =>
              item.hash ? (
                // Link tới 1 khối trong trang chủ: dùng Link thường (NavLink sẽ coi mọi "/#..." là đang ở trang chủ)
                <Link key={item.to} to={item.to} className="site-header__link">
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              ) : (
                // NavLink tự thêm class "active" khi đang ở đúng trang -> CSS gạch chân màu cam
                <NavLink key={item.to} to={item.to} end={item.end} className="site-header__link">
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </NavLink>
              ),
            )}
            {/* Trên điện thoại: các nút tài khoản nằm cuối menu xổ xuống */}
            {ready && (
              <div className="site-header__nav-actions">
                {!user && (
                  <Link to="/login" className="site-header__login">
                    <Icon name="logIn" size={16} />
                    Đăng nhập
                  </Link>
                )}
                {primaryAction}
              </div>
            )}
          </nav>

          <div className="site-header__actions">
            {ready && !user && (
              <Link to="/login" className="site-header__login">
                <Icon name="logIn" size={16} />
                Đăng nhập
              </Link>
            )}
            {primaryAction}
            {ready && user && <UserMenu />}
            <button
              type="button"
              className="site-header__burger"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
