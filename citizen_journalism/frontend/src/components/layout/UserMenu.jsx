import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../lib/roles'
import Icon from '../ui/Icon'
import '../../assets/styles/user-menu.css'

/** Chữ cái đại diện: chữ đầu của TÊN (từ cuối cùng, theo cách gọi tên người Việt), ví dụ "Trịnh Tuấn Anh" -> "A". */
const initialOf = (fullName = '') => fullName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? '?'

/**
 * Menu tài khoản trên thanh đầu trang khi ĐÃ ĐĂNG NHẬP: ảnh đại diện (chữ cái) + tên;
 * bấm vào thì xổ xuống thông tin tài khoản, "Đổi mật khẩu" và "Đăng xuất". CSS: assets/styles/user-menu.css.
 *
 * Đang dùng ở: routes/Homepage.jsx (thay cho 2 nút Đăng ký / Đăng nhập).
 * Sau này thêm mục mới (Hồ sơ của tôi, Trang quản trị...) thì thêm vào khối "user-menu__list".
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
        <span className="user-menu__avatar" aria-hidden="true">
          {initialOf(user.fullName)}
        </span>
        <span className="user-menu__name">{user.fullName}</span>
        <Icon name="chevronDown" size={16} className={`user-menu__chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__header">
            <span className="user-menu__avatar user-menu__avatar--lg" aria-hidden="true">
              {initialOf(user.fullName)}
            </span>
            <div>
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
              <span className="user-menu__role">{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
          </div>
          <div className="user-menu__list">
            <Link
              to="/account/change-password"
              className="user-menu__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon name="lock" size={16} />
              Đổi mật khẩu
            </Link>
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
