import { createContext } from 'react'

/**
 * "Kho" thông tin đăng nhập dùng chung cho toàn bộ web (React Context).
 *
 * TẠI SAO cần Context? Nhiều nơi cần biết "ai đang đăng nhập" (thanh menu, trang đăng nhập, trang admin...).
 * Nếu không có Context phải truyền props qua rất nhiều tầng component. Với Context, component nào cũng
 * lấy được trực tiếp bằng hook useAuth() (hooks/useAuth.js).
 *
 * File này CHỈ tạo context. Giá trị thật (user, login, logout...) do context/AuthProvider.jsx cung cấp.
 * Tách riêng để đúng quy tắc của React Fast Refresh (file component chỉ nên export component).
 */
export const AuthContext = createContext(null)
