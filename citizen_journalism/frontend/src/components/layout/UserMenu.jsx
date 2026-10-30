import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS, SUBMITTER_ROLES } from '../../lib/roles'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'
import '../../assets/styles/user-menu.css'

/**
 * Các mục điều hướng trong menu. Thêm trang mới (Tin đã gửi...) thì thêm 1 dòng ở đây.
 * roles (không bắt buộc): chỉ hiện mục cho các vai trò này.
 */
const MENU_LINKS = [
  { to: '/admin', icon: 'activity', label: 'Trang quản trị', roles: ['SYSTEM_ADMIN'] },
  { to: '/editor', icon: 'activity', label: 'Bàn biên tập', roles: ['EDITOR'] },
  { to: '/account/submissions', icon: 'fileText', label: 'Thông tin đã gửi', roles: SUBMITTER_ROLES },
  { to: '/research', icon: 'edit', label: 'Bài nghiên cứu của tôi', roles: ['EXPERT'] },
  { to: '/contributor/tasks', icon: 'mapPin', label: 'Nhiệm vụ của tôi', roles: ['CONTRIBUTOR'] },
  { to: '/account/profile', icon: 'user', label: 'Hồ sơ của tôi' },
  { to: '/account/change-password', icon: 'lock', label: 'Đổi mật khẩu' },
]

/**
 * Menu tài khoản trên thanh đầu trang khi ĐÃ ĐĂNG NHẬP: ảnh đại diện + tên;
 * bấm vào thì xổ xuống thông tin tài khoản, các mục trong MENU_LINKS và "Đăng xuất". CSS: assets/styles/user-menu.css.
 *
 * Đang dùng ở: routes/Homepage.jsx (thay cho 2 nút Đăng ký / Đăng nhập), components/layout/AccountLayout.jsx.
 * Ảnh đại diện lấy từ user.avatarUrl (chưa có ảnh thì Avatar tự hiện chữ cái đầu tên).
 *
 * TRẢI NGHIỆM: bấm ra ngoài hoặc nhấn phím Esc thì menu tự đóng.
 */
function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null) // Dùng để biết người dùng bấm vào trong hay ngoài menu

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    // Dọn dẹp: gỡ bỏ lắng nghe khi menu đóng hoặc component biến mất
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!user) return null

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.fullName} src={user.avatarUrl} size={28} />
        <span className="user-menu__name">{user.fullName}</span>
        <Icon name="chevronDown" size={16} className={`user-menu__chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__header">
            <Avatar name={user.fullName} src={user.avatarUrl} size={44} />
            <div>
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
              <span className="user-menu__role">{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
          </div>
          <div className="user-menu__list">
            {MENU_LINKS.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="user-menu__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            ))}
            <button type="button" className="user-menu__item user-menu__item--danger" role="menuitem" onClick={handleLogout}>
              <Icon name="logOut" size={16} />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
