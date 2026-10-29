import { useState } from 'react'
import { useForm } from '../../hooks/useForm'
import { createValidator, rules } from '../../lib/validators'
import { adminService } from '../../services/adminService'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import CopyButton from '../ui/CopyButton'
import Modal from '../ui/Modal'
import TextField from '../ui/TextField'

const validate = createValidator({
  adminPassword: [rules.required('Vui lòng nhập mật khẩu của bạn.')],
})

/**
 * Hộp thoại ĐẶT LẠI MẬT KHẨU cho người dùng quên mật khẩu mà không tự lấy lại được (mở từ trang /admin/users/:id).
 * POST /api/admin/users/{id}/reset-password (AdminService.resetPassword).
 *
 * 2 bước trong cùng một hộp thoại:
 *   1. Admin nhập lại mật khẩu CỦA MÌNH để xác nhận (sai -> lỗi dưới ô, mật khẩu người dùng không đổi).
 *   2. Đúng -> hiện mật khẩu tạm do backend sinh, kèm nút sao chép. Đóng hộp thoại là không xem lại được nữa.
 *
 * Props: user (tài khoản cần đặt lại), open, onClose.
 */
function ResetPasswordDialog({ user, open, onClose }) {
  const form = useForm({ adminPassword: '' }, validate)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const close = () => {
    form.reset({ adminPassword: '' })
    setTemporaryPassword('') // Xoá khỏi bộ nhớ trang, không để lộ khi mở lại
    onClose()
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await adminService.resetPassword(user.id, values.adminPassword)
    setTemporaryPassword(response.data)
  })

  return (
    <Modal open={open} title={temporaryPassword ? 'Đã đặt lại mật khẩu' : 'Đặt lại mật khẩu'} onClose={close}>
      {temporaryPassword ? (
        <div className="form">
          <dl className="credential-box">
            <dt>Tài khoản</dt>
            <dd>{user.email}</dd>
            <dt>Mật khẩu tạm</dt>
            <dd>
              <code>{temporaryPassword}</code>
            </dd>
          </dl>
          <p className="modal__text">
            Mật khẩu này chỉ hiện <strong>một lần</strong>. Hãy chuyển trực tiếp cho người dùng và nhắc họ đổi mật khẩu ngay sau khi đăng nhập.
          </p>
          <div className="modal__actions">
            <CopyButton
              label="Sao chép thông tin"
              text={`Tài khoản Tin Nóng Dân Sinh\nEmail: ${user.email}\nMật khẩu tạm: ${temporaryPassword}\nVui lòng đổi mật khẩu sau khi đăng nhập.`}
            />
            <Button onClick={close}>Xong</Button>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          <Alert type="warning">
            Chỉ đặt lại sau khi đã xác minh danh tính người yêu cầu (đối chiếu SĐT / CCCD). Mật khẩu cũ của{' '}
            <strong>{user.fullName}</strong> ({user.id}) sẽ không dùng được nữa.
          </Alert>
          <Alert type="error">{form.formError}</Alert>
          <TextField
            label="Mật khẩu của bạn (quản trị viên)"
            icon="lock"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            {...form.field('adminPassword')}
          />
          <div className="modal__actions">
            <Button variant="secondary" onClick={close} disabled={form.submitting}>
              Huỷ
            </Button>
            <Button type="submit" variant="danger" loading={form.submitting}>
              Xác nhận đặt lại
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default ResetPasswordDialog
