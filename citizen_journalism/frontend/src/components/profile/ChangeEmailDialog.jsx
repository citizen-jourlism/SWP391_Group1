import { useState } from 'react'
import { useForm } from '../../hooks/useForm'
import { useOtpFlow } from '../../hooks/useOtpFlow'
import { createValidator, rules } from '../../lib/validators'
import { userService } from '../../services/userService'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import OtpPanel from '../ui/OtpPanel'
import TextField from '../ui/TextField'

const validate = createValidator({
  email: [rules.required('Vui lòng nhập email mới.'), rules.email()],
})

/**
 * Hộp thoại ĐỔI EMAIL ở trang Hồ sơ, gồm 2 bước:
 *   Bước 1: nhập email mới -> POST /api/users/me/email -> backend gửi mã OTP tới EMAIL MỚI.
 *   Bước 2: nhập mã (OtpPanel + useOtpFlow, giống trang xác thực đăng ký) -> POST /api/users/me/email/verify.
 *           Đúng mã -> email được đổi -> onChanged(hồ sơ mới) + đóng hộp thoại.
 * TẠI SAO phải xác nhận? Email dùng để đăng nhập và nhận mã khôi phục; gõ nhầm mà không kiểm tra thì mất tài khoản.
 *
 * Props: open, currentEmail, onClose, onChanged(profile).
 */
function ChangeEmailDialog({ open, currentEmail, onClose, onChanged }) {
  const [sentTo, setSentTo] = useState('') // Email mới đã gửi mã ('' = đang ở bước 1)
  const form = useForm({ email: '' }, validate)

  const flow = useOtpFlow({
    onVerify: async (otp) => {
      const response = await userService.verifyEmailChange(otp)
      onChanged(response.data)
      close()
    },
    onResend: async () => (await userService.requestEmailChange(sentTo)).data,
  })

  /** Đóng và đưa hộp thoại về bước 1 cho lần mở sau. */
  const close = () => {
    setSentTo('')
    form.reset({ email: '' })
    onClose()
  }

  const sendCode = form.handleSubmit(async ({ email }) => {
    const response = await userService.requestEmailChange(email)
    flow.start(response.data)
    setSentTo(response.data.email)
  })

  return (
    <Modal open={open} title="Đổi email" onClose={close}>
      {!sentTo ? (
        // ----- Bước 1: nhập email mới -----
        <form className="form" onSubmit={sendCode} noValidate>
          <p className="modal__text">
            Email hiện tại: <strong>{currentEmail}</strong>. Chúng tôi sẽ gửi mã xác nhận tới email mới; email chỉ được
            đổi sau khi bạn nhập đúng mã.
          </p>
          <Alert type="error">{form.formError}</Alert>
          <TextField
            label="Email mới"
            icon="mail"
            type="email"
            placeholder="email-moi@domain.com"
            autoComplete="email"
            autoFocus
            required
            {...form.field('email')}
          />
          <Button type="submit" block loading={form.submitting}>
            {form.submitting ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
          </Button>
        </form>
      ) : (
        // ----- Bước 2: nhập mã -----
        <>
          <p className="modal__text">
            Nhập mã 6 số đã gửi tới <strong>{sentTo}</strong>.
          </p>
          <OtpPanel flow={flow} submitLabel="Xác nhận đổi email">
            <p className="otp-resend">
              <button type="button" className="link-button" onClick={() => setSentTo('')}>
                Dùng email khác
              </button>
            </p>
          </OtpPanel>
        </>
      )}
    </Modal>
  )
}

export default ChangeEmailDialog
