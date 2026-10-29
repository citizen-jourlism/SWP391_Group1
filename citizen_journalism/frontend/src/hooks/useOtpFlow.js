import { useState } from 'react'
import { toOtpState } from '../services/authService'
import { useCountdown } from './useCountdown'

const OTP_LENGTH = 6

/**
 * Quản lý TOÀN BỘ trạng thái của một màn hình "nhập mã OTP": mã đang gõ, đồng hồ hết hạn,
 * thời gian chờ gửi lại, thông báo lỗi/thành công, trạng thái đang gửi.
 * Dùng chung ở: xác thực đăng ký (VerifyOtp.jsx), đổi email (ChangeEmailDialog.jsx).
 * Giao diện tương ứng: components/ui/OtpPanel.jsx.
 *
 * @param initialState  thông tin OTP ban đầu dạng toOtpState() (hoặc null nếu chưa gửi mã)
 * @param onVerify      async (code) => ...   gọi API kiểm tra mã; ném lỗi nếu sai
 * @param onResend      async () => OtpInfo   gọi API gửi lại mã, trả về OtpInfo backend gửi về
 *
 * TẠI SAO tách hook? Nếu mỗi màn hình tự viết thì phải lặp lại khoảng 40 dòng state + xử lý giống hệt nhau.
 */
export function useOtpFlow({ initialState = null, onVerify, onResend }) {
  const [otpState, setOtpState] = useState(initialState) // { email, expiresAt, resendAt, printedToConsole }
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState(null) // { type, message }
  const [invalid, setInvalid] = useState(false) // true -> các ô OTP tô đỏ + rung
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  const expiresIn = useCountdown(otpState?.expiresAt)
  const resendIn = useCountdown(otpState?.resendAt)
  const expired = Boolean(otpState) && expiresIn === 0

  /** Bắt đầu một lượt nhập mã mới với OtpInfo vừa nhận từ backend (sau khi gửi mã lần đầu). */
  const start = (otpInfo, message = null) => {
    setOtpState(toOtpState(otpInfo))
    setCode('')
    setInvalid(false)
    setNotice(message ? { type: 'success', message } : null)
  }

  /** Người dùng gõ lại thì bỏ trạng thái đỏ của lần sai trước. */
  const changeCode = (value) => {
    setCode(value)
    setInvalid(false)
  }

  /** Gửi mã lên kiểm tra (gọi khi nhập đủ 6 số hoặc bấm nút). Sai -> báo lỗi, xoá ô để nhập lại. */
  const verify = async (otp = code) => {
    if (otp.length !== OTP_LENGTH || verifying || expired) return
    setVerifying(true)
    setNotice(null)
    try {
      await onVerify(otp)
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
      setInvalid(true)
      setCode('')
    } finally {
      setVerifying(false)
    }
  }

  /** Gửi lại mã mới và đặt lại 2 đồng hồ. */
  const resend = async () => {
    setResending(true)
    setNotice(null)
    try {
      start(await onResend(), 'Đã gửi mã OTP mới.')
    } catch (error) {
      setNotice({ type: 'error', message: error.message })
    } finally {
      setResending(false)
    }
  }

  return {
    otpState, code, notice, invalid, verifying, resending, expiresIn, resendIn, expired,
    start, changeCode, verify, resend, length: OTP_LENGTH,
  }
}
