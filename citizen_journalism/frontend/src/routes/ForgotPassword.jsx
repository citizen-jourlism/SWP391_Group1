import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import NewPasswordFields from '../components/ui/NewPasswordFields'
import OtpInput from '../components/ui/OtpInput'
import { DevMailNotice, OtpCountdown, OtpResendLink } from '../components/ui/OtpStatus'
import ResultView from '../components/ui/ResultView'
import TextField from '../components/ui/TextField'
import { useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { confirmPasswordRules, createValidator, newPasswordRules, rules } from '../lib/validators'
import { authService, toOtpState } from '../services/authService'

/*
 * TRANG QUÊN MẬT KHẨU — đường dẫn /forgot-password (khai báo trong App.jsx), mở từ link "Quên mật khẩu?"
 * ở trang Đăng nhập (email đã gõ ở đó được điền sẵn qua location.state.email).
 *
 * 3 BƯỚC TRÊN CÙNG 1 TRANG (không cần chuyển trang):
 *   Bước 1 (otpState = null): nhập email -> POST /api/auth/forgot-password -> backend gửi OTP qua email.
 *          Backend luôn trả lời giống nhau dù email có tồn tại hay không (chống dò email).
 *   Bước 2 (otpState có giá trị): nhập mã 6 số + mật khẩu mới -> POST /api/auth/reset-password.
 *   Bước 3 (done = true): báo thành công, nút "Đăng nhập ngay" (điền sẵn email).
 *
 * Dùng lại: OtpInput, OtpCountdown/OtpResendLink/DevMailNotice (đồng hồ + gửi lại mã),
 * NewPasswordFields (mật khẩu mới + nhập lại), ResultView (màn hình kết quả).
 */

const OTP_LENGTH = 6

// Mỗi bước có form + quy tắc kiểm tra riêng.
const validateEmail = createValidator({
  email: [rules.required('Vui lòng nhập email.'), rules.email()],
})

const validateReset = createValidator({
  otp: [rules.required('Vui lòng nhập mã OTP.'), rules.digits(OTP_LENGTH, 'Mã OTP gồm đúng 6 chữ số.')],
  newPassword: newPasswordRules,
  confirmPassword: confirmPasswordRules('newPassword'),
})

function ForgotPassword() {
  useDocumentTitle('Quên mật khẩu')
  const location = useLocation()

  const [otpState, setOtpState] = useState(null) // { email, expiresAt, resendAt, printedToConsole } sau bước 1
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState(null) // Thông báo thành công / lỗi gửi lại mã: { type, message }
  const [resending, setResending] = useState(false)

  const emailForm = useForm({ email: location.state?.email ?? '' }, validateEmail)
  const resetForm = useForm({ otp: '', newPassword: '', confirmPassword: '' }, validateReset)

  const expiresIn = useCountdown(otpState?.expiresAt)
  const resendIn = useCountdown(otpState?.resendAt)
  const expired = Boolean(otpState) && expiresIn === 0

  /** Bước 1: gửi mã. Lỗi (ví dụ gửi quá nhanh) thì useForm tự hiện trên form email. */
  const sendCode = emailForm.handleSubmit(async ({ email }) => {
    const response = await authService.forgotPassword(email)
    setOtpState(toOtpState(response.data))
    setNotice({ type: 'success', message: response.message })
  })

  /** Gửi lại mã ở bước 2. */
  const resend = async () => {
    setResending(true)
    setNotice(null)
    try {
      const response = await authService.forgotPassword(otpState.email)
      setOtpState(toOtpState(response.data)) // Đặt lại 2 đồng hồ
      resetForm.setValue('otp', '')
      setNotice({ type: 'success', message: 'Đã gửi lại mã OTP mới.' })
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setResending(false)
    }
  }

  /** Bước 2: đặt mật khẩu mới. Sai mã thì xoá ô OTP để nhập lại, rồi ném lỗi để useForm hiện thông báo. */
  const submitReset = resetForm.handleSubmit(async ({ otp, newPassword }) => {
    setNotice(null)
    try {
      await authService.resetPassword({ email: otpState.email, otp, newPassword })
      setDone(true)
    } catch (error) {
      resetForm.setValue('otp', '')
      throw error
    }
  })

  /** Quay lại bước 1 để nhập email khác. */
  const changeEmail = () => {
    setOtpState(null)
    setNotice(null)
  }

  // ===== Bước 3: thành công =====
  if (done) {
    return (
      <AuthLayout title="Đặt lại mật khẩu thành công!" subtitle="Bạn đã có thể đăng nhập bằng mật khẩu mới.">
        <ResultView text="Vì lý do bảo mật, hãy dùng mật khẩu khác với các trang web khác và không chia sẻ cho ai.">
          <Button to="/login" state={{ email: otpState.email }} block>
            Đăng nhập ngay
          </Button>
        </ResultView>
      </AuthLayout>
    )
  }

  const footer = (
    <>
      Nhớ ra mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
    </>
  )

  // ===== Bước 1: nhập email =====
  if (!otpState) {
    return (
      <AuthLayout
        badge="Khôi phục tài khoản"
        title="Quên mật khẩu?"
        subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để bạn đặt lại mật khẩu."
        footer={footer}
      >
        <form className="form" onSubmit={sendCode} noValidate>
          <Alert type="error">{emailForm.formError}</Alert>
          <TextField
            label="Email"
            icon="mail"
            type="email"
            placeholder="email@domain.com"
            autoComplete="email"
            autoFocus
            required
            {...emailForm.field('email')}
          />
          <Button type="submit" block loading={emailForm.submitting}>
            {emailForm.submitting ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
          </Button>
        </form>
      </AuthLayout>
    )
  }

  // ===== Bước 2: nhập mã + mật khẩu mới =====
  const otpError = resetForm.errorOf('otp')
  return (
    <AuthLayout
      badge="Bước 2/2 · Đặt mật khẩu mới"
      title="Đặt lại mật khẩu"
      subtitle={
        <>
          Nhập mã 6 số đã gửi tới <strong>{otpState.email}</strong> và mật khẩu mới của bạn.
        </>
      }
      footer={footer}
    >
      <form className="form" onSubmit={submitReset} noValidate>
        {/* Ưu tiên: lỗi khi đặt lại -> cảnh báo hết hạn -> thông báo gần nhất */}
        {resetForm.formError ? (
          <Alert type="error">{resetForm.formError}</Alert>
        ) : expired ? (
          <Alert type="warning">Mã OTP đã hết hạn. Vui lòng bấm &quot;Gửi lại mã&quot; để nhận mã mới.</Alert>
        ) : (
          notice && <Alert type={notice.type}>{notice.message}</Alert>
        )}

        <div className="field">
          <span className="field__label">
            Mã OTP<span className="field__required" aria-hidden="true">*</span>
          </span>
          <OtpInput
            value={resetForm.values.otp}
            onChange={(code) => resetForm.setValue('otp', code)}
            length={OTP_LENGTH}
            disabled={expired || resetForm.submitting}
            invalid={Boolean(otpError)}
          />
          {otpError && (
            <p className="field__error" role="alert">
              <Icon name="alertCircle" size={14} />
              {otpError}
            </p>
          )}
        </div>

        <OtpCountdown secondsLeft={expiresIn} />

        <NewPasswordFields form={resetForm} name="newPassword" label="Mật khẩu mới" />

        <Button type="submit" block loading={resetForm.submitting} disabled={expired}>
          {resetForm.submitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        </Button>

        <OtpResendLink secondsLeft={resendIn} sending={resending} onResend={resend} />

        <p className="otp-resend">
          <button type="button" className="link-button" onClick={changeEmail}>
            Dùng email khác
          </button>
        </p>

        <DevMailNotice show={otpState.printedToConsole} />
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword
