import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import ChangePassword from './routes/ChangePassword.jsx'
import ForgotPassword from './routes/ForgotPassword.jsx'
import Homepage from './routes/Homepage.jsx'
import Login from './routes/Login.jsx'
import NotFound from './routes/NotFound.jsx'
import Profile from './routes/Profile.jsx'
import Register from './routes/Register.jsx'
import SubmitReport from './routes/SubmitReport.jsx'
import VerifyOtp from './routes/VerifyOtp.jsx'
import { SUBMITTER_ROLES } from './lib/roles.js'
import AdminOverview from './routes/admin/AdminOverview.jsx'
import AdminUsers from './routes/admin/AdminUsers.jsx'

/**
 * Component gốc của ứng dụng: khai báo BẢN ĐỒ ĐƯỜNG DẪN (routing).
 * Mỗi <Route path="..."> ứng với một trang trong thư mục src/routes/.
 *
 * - BrowserRouter (React Router): cho phép đổi trang mà không tải lại toàn bộ web.
 * - AuthProvider: cung cấp thông tin đăng nhập cho MỌI trang (dùng qua hook useAuth()).
 * - ProtectedRoute: bọc các trang BẮT BUỘC đăng nhập (chưa đăng nhập -> chuyển sang /login).
 * Thêm trang mới: tạo file trong src/routes/ rồi thêm 1 dòng <Route> ở đây.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* ----- Trang công khai ----- */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />                     {/* Đăng nhập */}
          <Route path="/register" element={<Register />} />               {/* Đăng ký tài khoản */}
          <Route path="/verify-otp" element={<VerifyOtp />} />            {/* Nhập mã OTP sau khi đăng ký */}
          <Route path="/forgot-password" element={<ForgotPassword />} />  {/* Quên mật khẩu */}

          {/* ----- Trang cần đăng nhập ----- */}
          <Route
            path="/account/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          {/* Gửi phản ánh / khiếu nại: chỉ người dân, cộng tác viên, chuyên gia. /submit?type=hot-news để chọn sẵn Tin nóng */}
          <Route
            path="/submit"
            element={
              <ProtectedRoute roles={SUBMITTER_ROLES}>
                <SubmitReport />
              </ProtectedRoute>
            }
          />

          {/* ----- Khu quản trị: chỉ SYSTEM_ADMIN. Route LỒNG NHAU: AdminLayout là khung chung,
                   các trang con hiện vào chỗ <Outlet /> của khung. index = trang mặc định của /admin ----- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['SYSTEM_ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />           {/* /admin       : Tổng quan */}
            <Route path="users" element={<AdminUsers />} />       {/* /admin/users : Quản lý tài khoản */}
          </Route>

          {/* "*" = mọi đường dẫn không khớp ở trên (gõ sai link, hoặc trang chưa làm) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
