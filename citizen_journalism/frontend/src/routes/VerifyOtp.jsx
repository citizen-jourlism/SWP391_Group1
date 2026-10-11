import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import OtpInput from '../components/ui/OtpInput'
import { formatSeconds, useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { authService, pendingVerification } from '../services/authService'

const OTP_LENGTH = 6
const EXPIRED_NOTICE = { type: 'warning', message: 'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại mã" để nhận mã mới.' }

function VerifyOtp() {
  useDocumentTitle('Xác thực tài khoản')
  const [pending, setPending] = useState(() => pendingVerification.get())
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState(null) // { type, message }
  const [invalid, setInvalid] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)

  const expiresIn = useCountdown(pending?.expiresAt)
  const resendIn = useCountdown(pending?.resendAt)
  const expired = Boolean(pending) && expiresIn === 0
  const shownNotice = expired ? EXPIRED_NOTICE : notice

  // Vào thẳng trang này mà chưa đăng ký thì quay về trang đăng ký.
  if (!pending) return <Navigate to="/register" replace />

  const handleCodeChange = (value) => {
    setCode(value)
    setInvalid(false)
  }

  const verify = async (otp) => {
    if (otp.length !== OTP_LENGTH || verifying || expired) return
    setVerifying(true)
    setNotice(null)
    try {
      await authService.verifyOtp(pending.email, otp)
      pendingVerification.clear()
      setVerified(true)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
      setInvalid(true)
      setCode('')
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setNotice(null)
    try {
      const response = await authService.resendOtp(pending.email)
      setPending(pendingVerification.save(response.data))
      setCode('')
      setInvalid(false)
      setNotice({ type: 'success', message: 'Đã gửi mã OTP mới tới email của bạn.' })
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setResending(false)
    }
  }

  if (verified) {
    return (
      <AuthLayout title="Xác thực thành công!" subtitle="Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.">
        <div className="result">
          <div className="result__icon result__icon--success">
            <Icon name="checkCircle" size={44} strokeWidth={1.8} />
          </div>
          <p className="result__text">
            Chào mừng bạn đến với <strong>Tin Nóng Dân Sinh</strong>. Hãy đăng nhập để bắt đầu gửi tin và theo dõi
            tiến độ xử lý.
          </p>
          <div className="result__actions">
            <Button to="/login" block>
              Đăng nhập ngay
            </Button>
            <Button to="/" variant="secondary" block>
              Về trang chủ
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

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
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          verify(code)
        }}
      >
        <div className="otp-hero" aria-hidden="true">
          <Icon name="mail" size={30} strokeWidth={1.8} />
        </div>

        {shownNotice && <Alert type={shownNotice.type}>{shownNotice.message}</Alert>}

        <OtpInput
          value={code}
          onChange={handleCodeChange}
          onComplete={verify}
          length={OTP_LENGTH}
          disabled={verifying || expired}
          invalid={invalid}
        />

        <p className={`otp-timer ${expiresIn <= 30 ? 'is-urgent' : ''}`}>
          <Icon name="clock" size={15} />
          {expired ? 'Mã đã hết hạn' : <>Mã hết hạn sau <strong>{formatSeconds(expiresIn)}</strong></>}
        </p>

        <Button type="submit" block loading={verifying} disabled={code.length !== OTP_LENGTH || expired}>
          {verifying ? 'Đang xác thực...' : 'Xác nhận'}
        </Button>

        <p className="otp-resend">
          Chưa nhận được mã?{' '}
          <button type="button" className="link-button" onClick={resend} disabled={resendIn > 0 || resending}>
            {resending ? 'Đang gửi...' : resendIn > 0 ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
          </button>
        </p>

        {import.meta.env.DEV && (
          <Alert type="info">
            Chế độ phát triển: email chưa gửi thật, mã OTP được in trong cửa sổ log của backend (dòng
            <code> [DEV MAIL]</code>).
          </Alert>
        )}
      </form>
    </AuthLayout>
  )
}

export default VerifyOtp
