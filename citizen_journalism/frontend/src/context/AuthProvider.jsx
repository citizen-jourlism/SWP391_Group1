import { useCallback, useEffect, useMemo, useState } from 'react'
import { setUnauthorizedHandler } from '../lib/api'
import { tokenStorage } from '../lib/tokenStorage'
import { authService } from '../services/authService'
import { AuthContext } from './authContext'

/**
 * Quản lý TRẠNG THÁI ĐĂNG NHẬP của cả web. Bọc ngoài toàn bộ ứng dụng trong App.jsx.
 * Component bất kỳ lấy dữ liệu bằng: const { user, status, login, logout } = useAuth()
 *
 * GIÁ TRỊ CUNG CẤP:
 *   - user   : thông tin người đang đăng nhập { id, fullName, email, role, ... } hoặc null
 *   - status : 'loading' (đang kiểm tra token lúc mở web) | 'ready' (đã biết đăng nhập hay chưa)
 *   - login(loginData, remember): lưu token + user sau khi gọi API đăng nhập thành công
 *   - logout(): xoá token + user
 *   - loggedOut: true sau khi người dùng tự bấm đăng xuất (ProtectedRoute dựa vào đây để không nhớ trang cũ)
 *   - updateUser(changes): sửa một phần thông tin user (sau khi cập nhật hồ sơ)
 *
 * KHI MỞ / TẢI LẠI WEB: nếu trình duyệt còn token -> gọi GET /api/auth/me để
 *   (1) kiểm tra token còn hạn không, (2) lấy thông tin MỚI NHẤT của người dùng (có thể đã bị khoá).
 *   Lỗi -> coi như chưa đăng nhập.
 *
 * Đăng xuất không cần gọi backend: JWT là "stateless" (backend không lưu phiên), xoá token ở trình duyệt là đủ.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loggedOut, setLoggedOut] = useState(false)
  // Có token -> phải chờ hỏi backend ('loading'); không có token -> biết ngay là chưa đăng nhập ('ready').
  const [status, setStatus] = useState(() => (tokenStorage.get() ? 'loading' : 'ready'))

  // useCallback: giữ nguyên hàm giữa các lần render, tránh useEffect bên dưới chạy lại không cần thiết.
  const logout = useCallback(() => {
    tokenStorage.clear()
    setLoggedOut(true)
    setUser(null)
  }, [])

  const login = useCallback(({ accessToken, user: loggedInUser }, remember) => {
    setLoggedOut(false)
    tokenStorage.set(accessToken, remember)
    setUser(loggedInUser)
  }, [])

  /**
   * Cập nhật một phần thông tin người dùng đang lưu (ví dụ sau khi sửa hồ sơ / đổi ảnh đại diện),
   * để menu tài khoản đổi theo ngay mà không cần tải lại trang. Ví dụ: updateUser({ fullName, avatarUrl })
   */
  const updateUser = useCallback((changes) => {
    setUser((current) => (current ? { ...current, ...changes } : current))
  }, [])

  useEffect(() => {
    // Mọi API trả 401 khi đang có token (token hết hạn) -> tự đăng xuất (xem lib/api.js).
    setUnauthorizedHandler(logout)

    if (!tokenStorage.get()) return
    authService
      .me()
      .then((response) => setUser(response.data))
      // Token hết hạn / tài khoản bị khoá -> backend trả 401 -> lib/api.js đã tự gọi logout().
      // Lỗi khác (backend đang tắt / khởi động lại...) thì GIỮ token: tạm coi như chưa đăng nhập,
      // tải lại trang khi backend chạy là vào lại được ngay, không bắt người dùng đăng nhập lại.
      .catch(() => {})
      .finally(() => setStatus('ready'))
  }, [logout])

  // useMemo: chỉ tạo object mới khi dữ liệu thật sự đổi -> các component dùng useAuth() không bị vẽ lại thừa.
  const value = useMemo(
    () => ({ user, status, login, logout, updateUser, loggedOut }),
    [user, status, login, logout, updateUser, loggedOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
