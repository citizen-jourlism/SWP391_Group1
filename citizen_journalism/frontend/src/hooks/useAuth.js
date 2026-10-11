import { useContext } from 'react'
import { AuthContext } from '../context/authContext'

/**
 * Lấy thông tin đăng nhập ở bất kỳ component nào:
 *   const { user, status, login, logout } = useAuth()
 *   if (user) { ... đã đăng nhập ... }
 * Chi tiết các giá trị: xem context/AuthProvider.jsx.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    // Gặp lỗi này nghĩa là component đang nằm ngoài <AuthProvider> (xem App.jsx).
    throw new Error('useAuth() phải được dùng bên trong <AuthProvider>')
  }
  return context
}
