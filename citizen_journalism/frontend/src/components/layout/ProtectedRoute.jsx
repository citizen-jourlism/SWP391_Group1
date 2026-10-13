import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import NotFound from '../../routes/NotFound'

/**
 * "Người gác cổng" cho các trang BẮT BUỘC đăng nhập (và tuỳ chọn: đúng vai trò).
 * Dùng trong App.jsx:
 *   <Route path="/account/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
 *   <Route path="/admin" element={<ProtectedRoute roles={['SYSTEM_ADMIN']}><Admin /></ProtectedRoute>} />
 *
 * CÁCH HOẠT ĐỘNG:
 *   - Đang kiểm tra token lúc mở web (status 'loading'): chưa hiện gì, tránh bị đẩy sang trang đăng nhập oan.
 *   - Chưa đăng nhập: chuyển sang /login, kèm state.from = trang đang muốn vào,
 *     để đăng nhập xong quay lại đúng trang đó (xem Login.jsx).
 *   - Đăng nhập rồi nhưng sai vai trò: hiện trang "chưa sẵn sàng / không có quyền".
 *
 * LƯU Ý: đây chỉ là chặn ở GIAO DIỆN cho tiện người dùng. Bảo mật thật nằm ở backend (SecurityConfig),
 * vì người dùng có thể bỏ qua giao diện và gọi API trực tiếp.
 */
function ProtectedRoute({ roles, children }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return null
  // from gồm cả phần "?..." (ví dụ /submit?type=hot-news) để đăng nhập xong quay về đúng trang, đúng lựa chọn
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <NotFound />
  return children
}

export default ProtectedRoute
