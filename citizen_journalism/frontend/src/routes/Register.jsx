import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import PasswordStrength from '../components/ui/PasswordStrength'
import TextField from '../components/ui/TextField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { createValidator, rules } from '../lib/validators'
import { authService, pendingVerification } from '../services/authService'

const INITIAL_VALUES = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
}

const validate = createValidator({
  fullName: [rules.required('Vui lòng nhập họ và tên.'), rules.maxLength(100, 'Họ và tên tối đa 100 ký tự.')],
  email: [rules.required('Vui lòng nhập email.'), rules.email()],
  phone: [rules.required('Vui lòng nhập số điện thoại.'), rules.phone()],
  password: [
    rules.required('Vui lòng nhập mật khẩu.'),
    rules.minLength(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
    rules.maxLength(64, 'Mật khẩu tối đa 64 ký tự.'),
    rules.password(),
  ],
  confirmPassword: [
    rules.required('Vui lòng nhập lại mật khẩu.'),
    rules.sameAs('password', 'Mật khẩu nhập lại không khớp.'),
  ],
  agreeTerms: [rules.required('Bạn cần đồng ý với điều khoản để tiếp tục.')],
})

function Register() {
  useDocumentTitle('Đăng ký tài khoản')
  const navigate = useNavigate()
  const form = useForm(INITIAL_VALUES, validate)

  const onSubmit = form.handleSubmit(async ({ fullName, email, phone, password }) => {
    const response = await authService.register({ fullName, email, phone, password })
    pendingVerification.save(response.data)
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
      <form className="form" onSubmit={onSubmit} noValidate>
        <Alert type="error">{form.formError}</Alert>

        <TextField
          label="Họ và tên"
          icon="user"
          placeholder="Ví dụ: Nguyễn Văn An"
          autoComplete="name"
          required
          {...form.field('fullName')}
        />

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

        <TextField
          label="Mật khẩu"
          icon="lock"
          type="password"
          placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
          autoComplete="new-password"
          required
          {...form.field('password')}
        >
          <PasswordStrength password={form.values.password} />
        </TextField>

        <TextField
          label="Nhập lại mật khẩu"
          icon="lock"
          type="password"
          placeholder="Nhập lại mật khẩu ở trên"
          autoComplete="new-password"
          required
          {...form.field('confirmPassword')}
        />

        <Checkbox
          label={
            <>
              Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a> của toà soạn.
            </>
          }
          {...form.field('agreeTerms')}
        />

        <Button type="submit" block loading={form.submitting}>
          {form.submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Register
