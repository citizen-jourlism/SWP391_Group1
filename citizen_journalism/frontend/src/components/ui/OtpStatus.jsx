import { formatSeconds } from '../../hooks/useCountdown'
import Alert from './Alert'
import Icon from './Icon'

/*
 * Các mảnh giao diện xung quanh ô nhập OTP, dùng chung cho mọi màn hình nhập mã:
 * xác thực đăng ký (VerifyOtp.jsx) và đặt lại mật khẩu (ForgotPassword.jsx).
 * Số giây truyền vào lấy từ hook useCountdown(). CSS: .otp-timer, .otp-resend trong assets/styles/auth.css.
 */

/** Dòng "Mã hết hạn sau 04:59". Còn ≤ 30 giây thì chuyển chữ đỏ để nhắc người dùng. */
export function OtpCountdown({ secondsLeft }) {
  const expired = secondsLeft === 0
  return (
    <p className={`otp-timer ${secondsLeft <= 30 ? 'is-urgent' : ''}`}>
      <Icon name="clock" size={15} />
      {expired ? 'Mã đã hết hạn' : <>Mã hết hạn sau <strong>{formatSeconds(secondsLeft)}</strong></>}
    </p>
  )
}

/** Dòng "Chưa nhận được mã? Gửi lại mã". Nút bị khoá và hiện "Gửi lại sau Xs" cho tới khi hết thời gian chờ. */
export function OtpResendLink({ secondsLeft, sending, onResend }) {
  return (
    <p className="otp-resend">
      Chưa nhận được mã?{' '}
      <button type="button" className="link-button" onClick={onResend} disabled={secondsLeft > 0 || sending}>
        {sending ? 'Đang gửi...' : secondsLeft > 0 ? `Gửi lại sau ${secondsLeft}s` : 'Gửi lại mã'}
      </button>
    </p>
  )
}

/**
 * Hộp nhắc "mã OTP nằm trong log backend". Chỉ hiện khi backend báo email KHÔNG được gửi thật
 * (printedToConsole = true, tức MAIL_ENABLED=false, xem MailService.java ở backend).
 */
export function DevMailNotice({ show }) {
  if (!show) return null
  return (
    <Alert type="info">
      Chế độ phát triển: email chưa gửi thật, mã OTP được in trong cửa sổ log của backend (dòng
      <code> [DEV MAIL]</code>).
    </Alert>
  )
}
