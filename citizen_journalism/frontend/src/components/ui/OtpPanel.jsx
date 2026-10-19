import Alert from './Alert'
import Button from './Button'
import Icon from './Icon'
import OtpInput from './OtpInput'
import { DevMailNotice, OtpCountdown, OtpResendLink } from './OtpStatus'

const EXPIRED_MESSAGE = 'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại mã" để nhận mã mới.'

/**
 * Giao diện chuẩn của một màn hình nhập mã OTP, đi cùng hook useOtpFlow():
 *   [icon thư] -> [thông báo] -> [6 ô nhập] -> [đồng hồ] -> [nút xác nhận] -> [gửi lại mã] -> [gợi ý dev]
 * Dùng ở: VerifyOtp.jsx (xác thực đăng ký), ChangeEmailDialog.jsx (đổi email).
 *
 * Props:
 *   - flow        : kết quả của useOtpFlow()
 *   - submitLabel : chữ trên nút xác nhận (mặc định "Xác nhận")
 *   - children    : nội dung thêm ở cuối form (ví dụ link "Dùng email khác")
 */
function OtpPanel({ flow, submitLabel = 'Xác nhận', children }) {
  // Hết hạn thì luôn ưu tiên cảnh báo hết hạn; còn không thì hiện thông báo gần nhất.
  const notice = flow.expired ? { type: 'warning', message: EXPIRED_MESSAGE } : flow.notice

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault()
        flow.verify()
      }}
    >
      <div className="otp-hero" aria-hidden="true">
        <Icon name="mail" size={30} strokeWidth={1.8} />
      </div>

      {notice && <Alert type={notice.type}>{notice.message}</Alert>}

      {/* onComplete: nhập đủ 6 số là tự gửi luôn, không cần bấm nút */}
      <OtpInput
        value={flow.code}
        onChange={flow.changeCode}
        onComplete={flow.verify}
        length={flow.length}
        disabled={flow.verifying || flow.expired}
        invalid={flow.invalid}
      />

      <OtpCountdown secondsLeft={flow.expiresIn} />

      <Button type="submit" block loading={flow.verifying} disabled={flow.code.length !== flow.length || flow.expired}>
        {flow.verifying ? 'Đang xác thực...' : submitLabel}
      </Button>

      <OtpResendLink secondsLeft={flow.resendIn} sending={flow.resending} onResend={flow.resend} />

      {children}

      <DevMailNotice show={flow.otpState?.printedToConsole} />
    </form>
  )
}

export default OtpPanel
