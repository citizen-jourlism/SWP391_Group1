import api from '../lib/api'

/** Các lời gọi API liên quan tới tài khoản. */
export const authService = {
  register: (payload) => api.post('/auth/register', payload),
  verifyOtp: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
}

/**
 * Lưu tạm thông tin "đang chờ xác thực OTP" vào sessionStorage
 * để người dùng tải lại trang /verify-otp vẫn không mất email và đồng hồ đếm ngược.
 */
const PENDING_KEY = 'pendingVerification'

export const pendingVerification = {
  /** otpInfo = { email, expiresInSeconds, resendAfterSeconds } (dữ liệu backend trả về) */
  save({ email, expiresInSeconds, resendAfterSeconds }) {
    const now = Date.now()
    const value = { email, expiresAt: now + expiresInSeconds * 1000, resendAt: now + resendAfterSeconds * 1000 }
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(value))
    } catch {
      // Trình duyệt chặn storage: vẫn chạy được, chỉ mất dữ liệu khi tải lại trang.
    }
    return value
  },
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_KEY))
    } catch {
      return null
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(PENDING_KEY)
    } catch {
      // bỏ qua
    }
  },
}
