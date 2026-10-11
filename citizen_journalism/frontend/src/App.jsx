import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import Homepage from './routes/Homepage.jsx'
import NotFound from './routes/NotFound.jsx'
import Register from './routes/Register.jsx'
import VerifyOtp from './routes/VerifyOtp.jsx'

/**
 * Component gốc của ứng dụng: khai báo BẢN ĐỒ ĐƯỜNG DẪN (routing).
 * Mỗi <Route path="..."> ứng với một trang trong thư mục src/routes/.
 *
 * BrowserRouter (React Router) cho phép đổi trang mà không tải lại toàn bộ web.
 * Thêm trang mới: tạo file trong src/routes/ rồi thêm 1 dòng <Route> ở đây.
 */
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/register" element={<Register />} />     {/* Đăng ký tài khoản */}
        <Route path="/verify-otp" element={<VerifyOtp />} />  {/* Nhập mã OTP sau khi đăng ký */}
        {/* "*" = mọi đường dẫn không khớp ở trên (gõ sai link, hoặc trang chưa làm như /login) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
