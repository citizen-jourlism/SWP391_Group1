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
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { useOtpFlow } from '../hooks/useOtpFlow'
import { confirmPasswordRules, createValidator, newPasswordRules, rules } from '../lib/validators'
import { authService } from '../services/authService'

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
 * Dùng lại: hook useOtpFlow (đồng hồ, gửi lại mã, thông báo), OtpInput, OtpCountdown/OtpResendLink/DevMailNotice,
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

  const [done, setDone] = useState(false)

  const emailForm = useForm({ email: location.state?.email ?? '' }, validateEmail)
  const resetForm = useForm({ otp: '', newPassword: '', confirmPassword: '' }, validateReset)

  // Đồng hồ hết hạn, thời gian chờ gửi lại, thông báo, nút gửi lại mã: dùng chung hook useOtpFlow.
  // (Ô nhập mã nằm trong resetForm vì mã được gửi CÙNG mật khẩu mới, nên không dùng phần nhập mã của hook.)
  const flow = useOtpFlow({
    onResend: async () => {
      const response = await authService.forgotPassword(flow.otpState.email)
      resetForm.setValue('otp', '')
      return response.data // Hook tự đặt lại 2 đồng hồ + báo "Đã gửi mã OTP mới."
    },
  })
  const { otpState, expired } = flow // otpState = null nghĩa là đang ở bước 1

  /** Bước 1: gửi mã. Lỗi (ví dụ gửi quá nhanh) thì useForm tự hiện trên form email. */
  const sendCode = emailForm.handleSubmit(async ({ email }) => {
    const response = await authService.forgotPassword(email)
    flow.start(response.data, response.message)
  })

  /** Bước 2: đặt mật khẩu mới. Sai mã thì xoá ô OTP để nhập lại, rồi ném lỗi để useForm hiện thông báo. */
  const submitReset = resetForm.handleSubmit(async ({ otp, newPassword }) => {
    try {
      await authService.resetPassword({ email: otpState.email, otp, newPassword })
      setDone(true)
    } catch (error) {
      resetForm.setValue('otp', '')
      throw error
    }
  })

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
          flow.notice && <Alert type={flow.notice.type}>{flow.notice.message}</Alert>
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

        <OtpCountdown secondsLeft={flow.expiresIn} />

        <NewPasswordFields form={resetForm} name="newPassword" label="Mật khẩu mới" />

        <Button type="submit" block loading={resetForm.submitting} disabled={expired}>
          {resetForm.submitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        </Button>

        <OtpResendLink secondsLeft={flow.resendIn} sending={flow.resending} onResend={flow.resend} />

        <p className="otp-resend">
          {/* Quay lại bước 1 để nhập email khác */}
          <button type="button" className="link-button" onClick={flow.stop}>
            Dùng email khác
          </button>
        </p>

        <DevMailNotice show={otpState.printedToConsole} />
      </form>
    </AuthLayout>
  )
}

export default ForgotPassword
