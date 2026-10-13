import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import NewPasswordFields from '../components/ui/NewPasswordFields'
import TextField from '../components/ui/TextField'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { confirmPasswordRules, createValidator, newPasswordRules, rules } from '../lib/validators'
import { authService, pendingVerification } from '../services/authService'

/*
 * TRANG ĐĂNG KÝ TÀI KHOẢN — đường dẫn /register (khai báo trong App.jsx).
 *
 * LUỒNG:
 *   1. Người dùng điền form -> useForm kiểm tra dữ liệu ngay trên trình duyệt (theo `validate` bên dưới).
 *   2. Bấm "Đăng ký" -> gọi authService.register() -> backend POST /api/auth/register.
 *   3. Thành công: backend gửi OTP và trả về { email, expiresInSeconds, resendAfterSeconds }.
 *      Lưu vào sessionStorage (pendingVerification) rồi chuyển sang trang /verify-otp.
 *   4. Thất bại (email trùng, dữ liệu sai...): useForm tự hiện lỗi ở đầu form và dưới từng ô.
 */

// Giá trị ban đầu của form. agreeTerms là boolean nên useForm hiểu đó là checkbox.
const INITIAL_VALUES = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
}

// Quy tắc kiểm tra từng ô, khớp với RegisterRequest.java ở backend.
// Khai báo NGOÀI component để không bị tạo lại mỗi lần giao diện vẽ lại.
const validate = createValidator({
  fullName: [rules.required('Vui lòng nhập họ và tên.'), rules.maxLength(100, 'Họ và tên tối đa 100 ký tự.')],
  email: [rules.required('Vui lòng nhập email.'), rules.email()],
  phone: [rules.required('Vui lòng nhập số điện thoại.'), rules.phone()],
  password: newPasswordRules,
  confirmPassword: confirmPasswordRules('password'),
  agreeTerms: [rules.required('Bạn cần đồng ý với điều khoản để tiếp tục.')],
})

function Register() {
  useDocumentTitle('Đăng ký tài khoản')
  const navigate = useNavigate() // Hàm chuyển trang của React Router
  const form = useForm(INITIAL_VALUES, validate)
  const { user, status } = useAuth()

  // Đã đăng nhập rồi thì không cần đăng ký nữa -> về trang chủ.
  if (status === 'ready' && user) return <Navigate to="/" replace />

  // Chỉ chạy khi form đã hợp lệ (handleSubmit tự kiểm tra trước).
  // Không gửi confirmPassword và agreeTerms lên server: hai ô này chỉ dùng để kiểm tra ở giao diện.
  // Nếu register() lỗi thì handleSubmit tự bắt lỗi và hiện lên form, nên không cần try/catch ở đây.
  const onSubmit = form.handleSubmit(async ({ fullName, email, phone, password }) => {
    const response = await authService.register({ fullName, email, phone, password })
    pendingVerification.save(response.data) // Lưu email + mốc hết hạn để trang OTP dùng
    navigate('/verify-otp')
  })

  return (
    <AuthLayout
      badge="Tài khoản Người dân"
      title="Tạo tài khoản mới"
      subtitle="Đăng ký để gửi tin nóng, phản ánh và theo dõi tiến độ xử lý."
      footer={
        <>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </>
      }
    >
      {/* noValidate: tắt kiểu báo lỗi mặc định (bong bóng) của trình duyệt, dùng kiểu báo lỗi riêng của mình */}
      <form className="form" onSubmit={onSubmit} noValidate>
        {/* Lỗi chung từ server (ví dụ "Email này đã được đăng ký"); không có lỗi thì Alert tự ẩn */}
        <Alert type="error">{form.formError}</Alert>

        {/* {...form.field('fullName')} = gắn sẵn value, onChange, onBlur, error cho ô này */}

        <TextField
          label="Họ và tên"
          icon="user"
          placeholder="Ví dụ: Nguyễn Văn An"
          autoComplete="name"
          required
          {...form.field('fullName')}
        />

        {/* form__row: 2 ô nằm cạnh nhau; trên điện thoại tự xếp thành 1 cột (xem ui.css) */}
        <div className="form__row">
          <TextField
            label="Email"
            icon="mail"
            type="email"
            placeholder="email@domain.com"
            autoComplete="email"
            required
            {...form.field('email')}
          />
          <TextField
            label="Số điện thoại"
            icon="phone"
            type="tel"
            inputMode="numeric"
            placeholder="0912 345 678"
            autoComplete="tel"
            required
            {...form.field('phone')}
          />
        </div>

        {/* Ô "Mật khẩu" (kèm thanh đo độ mạnh) + "Nhập lại mật khẩu" — component dùng chung */}
        <NewPasswordFields form={form} />

        <Checkbox
          label={
            <>
              Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a> của toà soạn.
            </>
          }
          {...form.field('agreeTerms')}
        />

        {/* Đang gửi thì nút hiện vòng xoay và bị khoá, chống bấm 2 lần */}
        <Button type="submit" block loading={form.submitting}>
          {form.submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Register
