import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import TextField from '../components/ui/TextField'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { homePathFor } from '../lib/roles'
import { createValidator, rules } from '../lib/validators'
import { authService, pendingVerification } from '../services/authService'

/*
 * TRANG ĐĂNG NHẬP — đường dẫn /login (khai báo trong App.jsx).
 *
 * LUỒNG:
 *   1. Nhập email + mật khẩu (+ tuỳ chọn "Ghi nhớ đăng nhập") -> authService.login() -> POST /api/auth/login.
 *   2. Thành công: AuthProvider.login() lưu token + thông tin người dùng, rồi chuyển trang:
 *        - về trang người dùng định vào trước đó (nếu bị bắt đăng nhập giữa chừng, location.state.from)
 *        - nếu không thì về trang mặc định theo vai trò (lib/roles.js)
 *   3. Thất bại:
 *        - Sai email/mật khẩu, khoá tạm do sai nhiều lần -> useForm tự hiện thông báo ở đầu form.
 *        - Tài khoản chưa xác thực email (code ACCOUNT_NOT_VERIFIED) -> hiện thêm nút "Xác thực email ngay":
 *          gửi lại OTP rồi chuyển sang trang /verify-otp (dùng lại trang của chức năng Đăng ký).
 *
 * Đã đăng nhập rồi mà vào /login -> tự chuyển về trang chủ.
 * Email có thể được điền sẵn khi đi từ trang "Xác thực thành công" (location.state.email).
 */

const validate = createValidator({
  email: [rules.required('Vui lòng nhập email.'), rules.email()],
  password: [rules.required('Vui lòng nhập mật khẩu.')],
})

function Login() {
  useDocumentTitle('Đăng nhập')
  const navigate = useNavigate()
  const location = useLocation() // location.state: dữ liệu trang trước gửi kèm khi chuyển trang
  const { user, status, login } = useAuth()

  const form = useForm({ email: location.state?.email ?? '', password: '', rememberMe: false }, validate)
  // Email của tài khoản chưa xác thực (khác rỗng thì hiện nút "Xác thực email ngay").
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)

  // Đã đăng nhập (và không phải vừa bấm đăng nhập xong) -> không cần ở trang này nữa.
  if (status === 'ready' && user && !form.submitting) return <Navigate to="/" replace />

  const onSubmit = form.handleSubmit(async (values) => {
    setUnverifiedEmail('')
    try {
      const response = await authService.login(values)
      login(response.data, values.rememberMe)
      navigate(location.state?.from ?? homePathFor(response.data.user.role), { replace: true })
    } catch (error) {
      if (error.code === 'ACCOUNT_NOT_VERIFIED') setUnverifiedEmail(values.email)
      throw error // Ném tiếp để useForm hiện thông báo lỗi lên form
    }
  })

  /** Gửi lại OTP cho tài khoản chưa xác thực rồi chuyển sang trang nhập mã. */
  const startVerification = async () => {
    setSendingOtp(true)
    try {
      const response = await authService.resendOtp(unverifiedEmail)
      pendingVerification.save(response.data)
      navigate('/verify-otp')
    } catch (error) {
      form.setFormError(error.message) // Ví dụ: "Mã OTP vừa được gửi. Vui lòng đợi 40 giây..."
    } finally {
      setSendingOtp(false)
    }
  }

  return (
    <AuthLayout
      badge="Chào mừng trở lại"
      title="Đăng nhập"
      subtitle="Đăng nhập để gửi tin nóng, phản ánh và theo dõi tiến độ xử lý."
      footer={
        <>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {form.formError && (
          <Alert type={unverifiedEmail ? 'warning' : 'error'}>
            {form.formError}
            {/* Nút hành động riêng cho trường hợp tài khoản chưa xác thực email */}
            {unverifiedEmail && (
              <div className="alert__actions">
                <Button variant="secondary" loading={sendingOtp} onClick={startVerification}>
                  Xác thực email ngay
                </Button>
              </div>
            )}
          </Alert>
        )}

        <TextField
          label="Email"
          icon="mail"
          type="email"
          placeholder="email@domain.com"
          autoComplete="email"
          autoFocus={!location.state?.email} // Có email điền sẵn thì để con trỏ ở ô mật khẩu
          required
          {...form.field('email')}
        />

        <TextField
          label="Mật khẩu"
          icon="lock"
          type="password"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          autoFocus={Boolean(location.state?.email)}
          required
          {...form.field('password')}
        />

        {/* Hàng "Ghi nhớ đăng nhập" + "Quên mật khẩu?" */}
        <div className="form__inline">
          <Checkbox label="Ghi nhớ đăng nhập" {...form.field('rememberMe')} />
          {/* Trang Quên mật khẩu sẽ làm ở chức năng sau; hiện tại link dẫn tới trang "chưa sẵn sàng" */}
          <Link to="/forgot-password" className="text-link">
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" block loading={form.submitting}>
          {form.submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Login
