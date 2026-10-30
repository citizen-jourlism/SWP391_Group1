import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { homePathFor } from '../../lib/roles'

/**
 * Đưa người dùng về đúng trang chính khi đường dẫn không tồn tại (route "*" trong App.jsx):
 * đã đăng nhập thì về trang chính của vai trò (admin -> /admin, Biên tập viên -> /editor...), chưa đăng nhập thì về trang chủ.
 */
function RoleHomeRedirect() {
  const { user, status } = useAuth()

  if (status === 'loading') return null // Chưa biết đăng nhập hay chưa thì chờ, tránh chuyển nhầm trang
  return <Navigate to={user ? homePathFor(user.role) : '/'} replace />
}

export default RoleHomeRedirect
