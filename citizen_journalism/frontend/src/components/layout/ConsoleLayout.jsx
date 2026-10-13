import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import '../../assets/styles/ui.css'
import '../../assets/styles/admin.css'

/**
 * KHUNG "BÀN LÀM VIỆC NỘI BỘ" DÙNG CHUNG cho khu Quản trị (AdminLayout) và bàn Biên tập viên (EditorLayout).
 * Hai nơi khác nhau ở MÀU (theme) và DANH SÁCH MỤC (navGroups); bố cục, menu ngăn kéo trên điện thoại... viết 1 lần ở đây.
 *
 *   ┌────────────┬──────────────────────────────────────────────┐
 *   │ [Logo]     │ ☰  Gốc / Mục        [topbarExtra]  [Tên ▾]   │  <- thanh tiêu đề
 *   │ NHÓM 1     ├──────────────────────────────────────────────┤
 *   │ ▸ Mục      │                                              │
 *   │ NHÓM 2     │   <Outlet /> = nội dung trang con            │
 *   │ ▸ Mục  Sắp │                                              │
 *   │ ⌂ Trang chủ│                                              │
 *   │ ⎋ Đăng xuất│                                              │
 *   └────────────┴──────────────────────────────────────────────┘
 * Màn hình hẹp (≤ 900px): menu ẩn, bấm ☰ để mở dạng ngăn kéo.
 *
 * Props:
 *   - theme       : 'admin' (menu tối) | 'editor' (menu sáng, CSS trong editor.css)
 *   - homePath    : trang đầu của khu này (bấm logo quay về)
 *   - badge       : nhãn nhỏ dưới tên hệ thống, ví dụ "Admin Console"
 *   - crumbRoot   : chữ đầu dòng "đường dẫn" trên thanh tiêu đề, ví dụ "Quản trị"
 *   - roleLabel   : chức danh hiện dưới tên người dùng
 *   - navGroups   : [{ label, items: [{ to, end, icon, label, title, soon }] }]
 *                   soon = chức năng chưa làm -> hiện nhãn "Sắp có" (trang vẫn mở được để xem thiết kế)
 *   - topbarExtra : nội dung thêm trên thanh tiêu đề (không bắt buộc)
 *
 * <Outlet />: React Router chèn trang con theo đường dẫn vào đúng chỗ này (route lồng nhau, xem App.jsx).
 * CSS: assets/styles/admin.css (bố cục chung, class "admin__*" giữ tên cũ) + editor.css (theme editor).
 */
function ConsoleLayout({ theme, homePath, badge, crumbRoot, roleLabel, navGroups, topbarExtra }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false) // Menu ngăn kéo trên màn hình hẹp

  // Mục đang mở = mục có đường dẫn DÀI NHẤT khớp với đầu đường dẫn hiện tại
  // (ví dụ /editor/applications/3 khớp cả "/editor" và "/editor/applications" -> lấy mục sau).
  const items = navGroups.flatMap((group) => group.items)
  const current =
    items
      .filter((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
      .sort((a, b) => b.to.length - a.to.length)[0] ?? items[0]
  useDocumentTitle(`${current.title} · ${crumbRoot}`)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className={`admin admin--${theme} ${menuOpen ? 'is-menu-open' : ''}`}>
      {/* ===== Thanh menu dọc ===== */}
      <aside className="admin__sidebar">
        <Link to={homePath} className="admin__brand" onClick={closeMenu}>
          <Logo size={36} />
          <span>
            <strong>TIN NÓNG DÂN SINH</strong>
            <small>{badge}</small>
          </span>
        </Link>

        <nav className="admin__nav" aria-label={`Menu ${crumbRoot}`}>
          {navGroups.map((group) => (
            <div key={group.label} className="admin__nav-group">
              <span className="admin__nav-label">{group.label}</span>
              {group.items.map((item) => (
                // NavLink tự thêm class "active" khi đường dẫn khớp; end: chỉ khớp đúng đường dẫn, không khớp trang con
                <NavLink key={item.to} to={item.to} end={item.end} className="admin__nav-item" onClick={closeMenu}>
                  <Icon name={item.icon} size={18} />
                  <span className="admin__nav-text">{item.label}</span>
                  {item.soon && <span className="admin__soon">Sắp có</span>}
                </NavLink>
              ))}
            </div>
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
      <div className="admin__backdrop" onClick={closeMenu} aria-hidden="true" />

      {/* ===== Khu nội dung ===== */}
      <div className="admin__main">
        <header className="admin__topbar">
          <button type="button" className="admin__menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Mở menu">
            <span />
            <span />
            <span />
          </button>
          <div className="admin__title">
            <span className="admin__crumb">
              {crumbRoot} / {current.label}
            </span>
            <h1>{current.title}</h1>
          </div>
          {topbarExtra}
          <div className="admin__me">
            <div className="admin__me-text">
              <strong>{user?.fullName}</strong>
              <small>{roleLabel}</small>
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

export default ConsoleLayout
