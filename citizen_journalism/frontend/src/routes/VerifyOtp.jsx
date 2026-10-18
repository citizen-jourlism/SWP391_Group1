import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import OtpPanel from '../components/ui/OtpPanel'
import ResultView from '../components/ui/ResultView'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useOtpFlow } from '../hooks/useOtpFlow'
import { authService, pendingVerification } from '../services/authService'

/*
 * TRANG NHẬP MÃ OTP — đường dẫn /verify-otp (khai báo trong App.jsx). Bước 2 sau khi Đăng ký.
 *
 * LUỒNG:
 *   1. Đọc { email, expiresAt, resendAt } đã lưu ở sessionStorage (do trang Register lưu).
 *      Không có (người dùng vào thẳng link) thì chuyển về /register.
 *   2. Người dùng nhập đủ 6 số (hoặc bấm "Xác nhận") -> authService.verifyOtp() -> backend kiểm tra.
 *        Đúng: xoá sessionStorage, hiện màn hình "Xác thực thành công".
 *        Sai: hiện lỗi (ví dụ "còn 4 lần thử"), xoá ô nhập, các ô rung đỏ.
 *   3. "Gửi lại mã": chỉ bấm được khi hết thời gian chờ; gửi xong thì đặt lại 2 đồng hồ.
 * Phần state (mã, đồng hồ, gửi lại...) do hook useOtpFlow lo; giao diện nhập mã do OtpPanel lo.
 */

function VerifyOtp() {
  useDocumentTitle('Xác thực tài khoản')
  // useState(() => ...): chỉ đọc sessionStorage 1 lần lúc mở trang.
  const [pending] = useState(() => pendingVerification.get()) // { email, expiresAt, resendAt, printedToConsole }
  const [verified, setVerified] = useState(false)

  const flow = useOtpFlow({
    initialState: pending,
    onVerify: async (otp) => {
      await authService.verifyOtp(pending.email, otp)
      pendingVerification.clear() // Xong việc, xoá dữ liệu tạm
      setVerified(true)
    },
    onResend: async () => {
      const response = await authService.resendOtp(pending.email)
      pendingVerification.save(response.data) // Lưu mốc mới để tải lại trang vẫn đúng đồng hồ
      return response.data
    },
  })

  // Vào thẳng trang này mà chưa đăng ký thì quay về trang đăng ký.
  // (Đặt SAU các hook vì React yêu cầu mọi hook phải được gọi theo cùng thứ tự ở mọi lần render.)
  if (!pending) return <Navigate to="/register" replace />

  // ===== Màn hình 2: xác thực thành công =====
  if (verified) {
    return (
      <AuthLayout title="Xác thực thành công!" subtitle="Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.">
        <ResultView
          text={
            <>
              Chào mừng bạn đến với <strong>Tin Nóng Dân Sinh</strong>. Hãy đăng nhập để bắt đầu gửi tin và theo dõi
              tiến độ xử lý.
            </>
          }
        >
          {/* state={{ email }}: gửi kèm email sang trang Đăng nhập để điền sẵn, người dùng chỉ cần nhập mật khẩu */}
          <Button to="/login" state={{ email: pending.email }} block>
            Đăng nhập ngay
          </Button>
          <Button to="/" variant="secondary" block>
            Về trang chủ
          </Button>
        </ResultView>
      </AuthLayout>
    )
  }

  // ===== Màn hình 1: nhập mã =====
  return (
    <AuthLayout
      badge="Bước 2/2 · Xác thực email"
      title="Nhập mã xác thực"
      subtitle={
        <>
          Mã gồm 6 chữ số đã được gửi tới <strong>{pending.email}</strong>
        </>
      }
      footer={
        <>
          Sai địa chỉ email? <Link to="/register">Đăng ký lại</Link>
        </>
      }
    >
      <OtpPanel flow={flow} />
    </AuthLayout>
  )
}

export default VerifyOtp
