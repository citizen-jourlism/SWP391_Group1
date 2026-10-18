import { useState } from 'react'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import NewPasswordFields from '../components/ui/NewPasswordFields'
import ResultView from '../components/ui/ResultView'
import TextField from '../components/ui/TextField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { confirmPasswordRules, createValidator, newPasswordRules, rules } from '../lib/validators'
import { authService } from '../services/authService'

/*
 * TRANG ĐỔI MẬT KHẨU — đường dẫn /account/change-password. BẮT BUỘC đăng nhập
 * (được bọc trong <ProtectedRoute> ở App.jsx). Mở từ menu tài khoản (UserMenu) -> "Đổi mật khẩu".
 *
 * LUỒNG: nhập mật khẩu hiện tại + mật khẩu mới -> PUT /api/auth/change-password (api.js tự gắn token).
 *   - Sai mật khẩu hiện tại / mật khẩu mới trùng mật khẩu cũ -> backend báo lỗi, hiện ở đầu form.
 *   - Thành công -> màn hình kết quả. Người dùng VẪN đăng nhập (không bị đăng xuất).
 */

const validate = createValidator({
  currentPassword: [rules.required('Vui lòng nhập mật khẩu hiện tại.')],
  newPassword: [
    ...newPasswordRules,
    rules.differentFrom('currentPassword', 'Mật khẩu mới phải khác mật khẩu hiện tại.'),
  ],
  confirmPassword: confirmPasswordRules('newPassword'),
})

function ChangePassword() {
  useDocumentTitle('Đổi mật khẩu')
  const [done, setDone] = useState(false)
  const form = useForm({ currentPassword: '', newPassword: '', confirmPassword: '' }, validate)

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    await authService.changePassword({ currentPassword, newPassword })
    setDone(true)
  })

  if (done) {
    return (
      <AuthLayout title="Đổi mật khẩu thành công!" subtitle="Lần đăng nhập tới, hãy dùng mật khẩu mới của bạn.">
        <ResultView>
          <Button to="/" block>
            Về trang chủ
          </Button>
        </ResultView>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      badge="Bảo mật tài khoản"
      title="Đổi mật khẩu"
      subtitle="Để bảo vệ tài khoản, hãy nhập mật khẩu hiện tại trước khi đặt mật khẩu mới."
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        <Alert type="error">{form.formError}</Alert>

        <TextField
          label="Mật khẩu hiện tại"
          icon="lock"
          type="password"
          placeholder="Nhập mật khẩu đang dùng"
          autoComplete="current-password"
          autoFocus
          required
          {...form.field('currentPassword')}
        />

        <NewPasswordFields form={form} name="newPassword" label="Mật khẩu mới" />

        <Button type="submit" block loading={form.submitting}>
          {form.submitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default ChangePassword
