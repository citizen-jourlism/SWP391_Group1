import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import OtpInput from '../components/ui/OtpInput'
import { DevMailNotice, OtpCountdown, OtpResendLink } from '../components/ui/OtpStatus'
import ResultView from '../components/ui/ResultView'
import { useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { authService, pendingVerification } from '../services/authService'

/*
 * TRANG NHẬP MÃ OTP — đường dẫn /verify-otp (khai báo trong App.jsx). Bước 2 sau khi Đăng ký.
 *
 * LUỒNG:
 *   1. Đọc { email, expiresAt, resendAt } đã lưu ở sessionStorage (do trang Register lưu).
 *      Không có (người dùng vào thẳng link) thì chuyển về /register.
 *   2. Người dùng nhập đủ 6 số (hoặc bấm "Xác nhận") -> authService.verifyOtp() -> backend kiểm tra.
 *        Đúng: xoá sessionStorage, hiện màn hình "Xác thực thành công".
 *        Sai: hiện lỗi (ví dụ "còn 4 lần thử"), xoá ô nhập, các ô rung đỏ.
 *   3. "Gửi lại mã": chỉ bấm được khi hết thời gian chờ (đếm ngược resendAt); gửi xong thì đặt lại 2 đồng hồ.
 *   4. Hết hạn mã (đồng hồ về 0): khoá ô nhập, nhắc người dùng gửi lại mã.
 */

const OTP_LENGTH = 6
const EXPIRED_NOTICE = { type: 'warning', message: 'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại mã" để nhận mã mới.' }

function VerifyOtp() {
  useDocumentTitle('Xác thực tài khoản')
  // useState(() => ...): chỉ đọc sessionStorage 1 lần lúc mở trang, không đọc lại mỗi lần vẽ lại.
  const [pending, setPending] = useState(() => pendingVerification.get()) // { email, expiresAt, resendAt }
  const [code, setCode] = useState('')              // Mã đang nhập, ví dụ "1234"
  const [notice, setNotice] = useState(null)        // Thông báo đang hiện: { type, message }
  const [invalid, setInvalid] = useState(false)     // true thì các ô OTP tô đỏ + rung
  const [verifying, setVerifying] = useState(false) // Đang gửi mã lên kiểm tra
  const [resending, setResending] = useState(false) // Đang gửi lại mã
  const [verified, setVerified] = useState(false)   // Đã xác thực thành công -> đổi sang màn hình chúc mừng

  // Hai đồng hồ đếm ngược (đơn vị: giây), tự cập nhật mỗi giây.
  const expiresIn = useCountdown(pending?.expiresAt) // Còn bao lâu mã hết hạn
  const resendIn = useCountdown(pending?.resendAt)   // Còn bao lâu được bấm gửi lại
  const expired = Boolean(pending) && expiresIn === 0
  // Hết hạn thì luôn ưu tiên hiện cảnh báo hết hạn; còn không thì hiện thông báo gần nhất.
  const shownNotice = expired ? EXPIRED_NOTICE : notice

  // Vào thẳng trang này mà chưa đăng ký thì quay về trang đăng ký.
  // (Đặt SAU các hook vì React yêu cầu mọi hook phải được gọi theo cùng thứ tự ở mọi lần render.)
  if (!pending) return <Navigate to="/register" replace />

  // Người dùng gõ lại thì bỏ trạng thái đỏ của lần sai trước.
  const handleCodeChange = (value) => {
    setCode(value)
    setInvalid(false)
  }

  /** Gửi mã lên backend kiểm tra. Được gọi khi nhập đủ 6 số (OtpInput.onComplete) hoặc bấm nút Xác nhận. */
  const verify = async (otp) => {
    // Chặn gửi khi: chưa đủ số, đang gửi dở (tránh gửi 2 lần), hoặc mã đã hết hạn.
    if (otp.length !== OTP_LENGTH || verifying || expired) return
    setVerifying(true)
    setNotice(null)
    try {
      await authService.verifyOtp(pending.email, otp)
      pendingVerification.clear() // Xong việc, xoá dữ liệu tạm
      setVerified(true)
    } catch (error) {
      setNotice({ type: 'error', message: error.message }) // Ví dụ: "Mã OTP không đúng. Bạn còn 4 lần thử."
      setInvalid(true)
      setCode('') // Xoá ô để nhập lại; OtpInput tự đưa con trỏ về ô đầu
    } finally {
      setVerifying(false)
    }
  }

  /** Gửi lại mã mới. Backend trả về thời gian mới, nên lưu lại và cập nhật state để 2 đồng hồ chạy lại từ đầu. */
  const resend = async () => {
    setResending(true)
    setNotice(null)
    try {
      const response = await authService.resendOtp(pending.email)
      setPending(pendingVerification.save(response.data)) // Đổi pending -> useCountdown nhận mốc mới
      setCode('')
      setInvalid(false)
      setNotice({ type: 'success', message: 'Đã gửi mã OTP mới tới email của bạn.' })
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setResending(false)
    }
  }

  // ===== Màn hình 2: xác thực thành công =====
  if (verified) {
    return (
      <AuthLayout title="Xác thực thành công!" subtitle="Tài khoản của bạn đã được kích hoạt và sẵn sàng sử dụng.">
        <ResultView
          text={
            <>
              Chào mừng bạn đến với <strong>Tin Nóng Dân Sinh</strong>. Hãy đăng nhập để bắt đầu gửi tin và theo dõi
              tiến độ xử lý.
            </>
          }
        >
          {/* state={{ email }}: gửi kèm email sang trang Đăng nhập để điền sẵn, người dùng chỉ cần nhập mật khẩu */}
          <Button to="/login" state={{ email: pending.email }} block>
            Đăng nhập ngay
          </Button>
          <Button to="/" variant="secondary" block>
            Về trang chủ
          </Button>
        </ResultView>
      </AuthLayout>
    )
  }

  // ===== Màn hình 1: nhập mã =====
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

        {/* onComplete={verify}: nhập đủ 6 số là tự gửi luôn, không cần bấm nút */}
        <OtpInput
          value={code}
          onChange={handleCodeChange}
          onComplete={verify}
          length={OTP_LENGTH}
          disabled={verifying || expired}
          invalid={invalid}
        />

        {/* Đồng hồ / nút gửi lại / gợi ý xem log: các component dùng chung trong components/ui/OtpStatus.jsx */}
        <OtpCountdown secondsLeft={expiresIn} />

        <Button type="submit" block loading={verifying} disabled={code.length !== OTP_LENGTH || expired}>
          {verifying ? 'Đang xác thực...' : 'Xác nhận'}
        </Button>

        <OtpResendLink secondsLeft={resendIn} sending={resending} onResend={resend} />

        <DevMailNotice show={pending.printedToConsole} />
      </form>
    </AuthLayout>
  )
}

export default VerifyOtp
