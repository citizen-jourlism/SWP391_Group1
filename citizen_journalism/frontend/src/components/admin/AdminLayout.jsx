import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import '../../assets/styles/ui.css'
import '../../assets/styles/admin.css'

/** Các mục của khu quản trị. Thêm trang quản trị mới: thêm 1 dòng ở đây + 1 <Route> con trong App.jsx. */
const NAV_ITEMS = [
  { to: '/admin', end: true, icon: 'activity', label: 'Tổng quan', title: 'Tổng quan hệ thống' },
  { to: '/admin/users', icon: 'user', label: 'Tài khoản', title: 'Quản lý tài khoản' },
]

/**
 * KHUNG RIÊNG của khu quản trị (/admin/...), cố ý thiết kế KHÁC HẲN trang người dùng:
 *
 *   ┌────────────┬──────────────────────────────────────────────┐
 *   │ [Logo]     │ ☰  Tiêu đề trang                 [Admin ▾]   │  <- thanh tiêu đề trắng
 *   │ ADMIN      ├──────────────────────────────────────────────┤
 *   │ ▸ Tổng quan│                                              │
 *   │ ▸ Tài khoản│   <Outlet /> = nội dung trang con            │
 *   │            │   (AdminOverview / AdminUsers)               │
 *   │ ⌂ Trang chủ│                                              │
 *   │ ⎋ Đăng xuất│                                              │
 *   └────────────┴──────────────────────────────────────────────┘
 *   Thanh menu dọc tông tối, ô đang chọn có vạch cam. Màn hình hẹp: menu ẩn, bấm ☰ để mở dạng ngăn kéo.
 *
 * <Outlet />: React Router chèn trang con tương ứng với đường dẫn vào đúng chỗ này (route lồng nhau).
 * Bảo vệ quyền: App.jsx bọc khung này trong <ProtectedRoute roles={['SYSTEM_ADMIN']}>.
 * CSS: assets/styles/admin.css.
 */
function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false) // Menu ngăn kéo trên màn hình hẹp

  // Tìm mục đang mở để lấy tiêu đề trang (mục dài nhất khớp với đầu đường dẫn).
  const current = [...NAV_ITEMS].reverse().find((item) => pathname.startsWith(item.to)) ?? NAV_ITEMS[0]
  useDocumentTitle(`${current.title} · Quản trị`)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={`admin ${menuOpen ? 'is-menu-open' : ''}`}>
      {/* ===== Thanh menu dọc ===== */}
      <aside className="admin__sidebar">
        <Link to="/admin" className="admin__brand" onClick={() => setMenuOpen(false)}>
          <Logo size={36} />
          <span>
            <strong>TIN NÓNG DÂN SINH</strong>
            <small>Admin Console</small>
          </span>
        </Link>

        <nav className="admin__nav" aria-label="Menu quản trị">
          <span className="admin__nav-label">Quản lý</span>
          {NAV_ITEMS.map((item) => (
            // NavLink tự thêm class "active" khi đường dẫn khớp; end: chỉ khớp đúng /admin, không khớp /admin/users
            <NavLink key={item.to} to={item.to} end={item.end} className="admin__nav-item" onClick={() => setMenuOpen(false)}>
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin__sidebar-footer">
          <Link to="/" className="admin__nav-item">
            <Icon name="home" size={18} />
            Về trang người dùng
          </Link>
          <button type="button" className="admin__nav-item admin__nav-item--danger" onClick={handleLogout}>
            <Icon name="logOut" size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Lớp nền tối phía sau menu ngăn kéo (màn hình hẹp); bấm vào để đóng menu */}
      <div className="admin__backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      {/* ===== Khu nội dung ===== */}
      <div className="admin__main">
        <header className="admin__topbar">
          <button type="button" className="admin__menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Mở menu">
            <span />
            <span />
            <span />
          </button>
          <div className="admin__title">
            <span className="admin__crumb">Quản trị / {current.label}</span>
            <h1>{current.title}</h1>
          </div>
          <div className="admin__me">
            <div className="admin__me-text">
              <strong>{user?.fullName}</strong>
              <small>Quản trị hệ thống</small>
            </div>
            <Avatar name={user?.fullName} src={user?.avatarUrl} size={38} />
          </div>
        </header>

        <main className="admin__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
