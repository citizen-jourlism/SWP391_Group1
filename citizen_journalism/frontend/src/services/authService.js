import api from '../lib/api'

/**
 * SERVICE phía frontend: gom các lời gọi API liên quan tới TÀI KHOẢN vào một chỗ.
 * Các trang (Register.jsx, VerifyOtp.jsx...) chỉ gọi authService.register(...) mà không cần
 * biết đường dẫn API cụ thể. Đổi đường dẫn thì chỉ sửa ở đây.
 *
 * Mỗi hàm trả về Promise: thành công -> { success, message, data }, thất bại -> { status, message, errors }
 * (xem lib/api.js). Mỗi hàm ứng với một endpoint trong backend AuthController.java.
 */
export const authService = {
  register: (payload) => api.post('/auth/register', payload),           // payload = { fullName, email, phone, password }
  verifyOtp: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  login: (payload) => api.post('/auth/login', payload),                 // payload = { email, password, rememberMe }
  me: () => api.get('/auth/me'),                                        // cần token (api.js tự gắn)
}

/**
 * Lưu tạm thông tin "đang chờ xác thực OTP" vào sessionStorage của trình duyệt.
 *
 * TẠI SAO? Sau khi đăng ký, trang /verify-otp cần biết email và thời điểm hết hạn.
 * Nếu chỉ giữ trong bộ nhớ React thì tải lại trang (F5) sẽ mất hết.
 * sessionStorage tự xoá khi đóng tab, nên không để lại dữ liệu lâu dài.
 * Lưu MỐC THỜI GIAN (expiresAt, resendAt) chứ không lưu "còn bao nhiêu giây", để đồng hồ luôn đúng.
 *
 * try/catch: một số trình duyệt (chế độ ẩn danh, chặn cookie) không cho dùng storage.
 * Khi đó app vẫn chạy bình thường, chỉ mất dữ liệu nếu tải lại trang.
 */
const PENDING_KEY = 'pendingVerification'

export const pendingVerification = {
  /** Lưu thông tin OtpInfo backend trả về: { email, expiresInSeconds, resendAfterSeconds, printedToConsole }. */
  save({ email, expiresInSeconds, resendAfterSeconds, printedToConsole }) {
    const now = Date.now()
    const value = {
      email,
      expiresAt: now + expiresInSeconds * 1000,
      resendAt: now + resendAfterSeconds * 1000,
      printedToConsole, // true = backend chưa gửi mail thật, mã nằm trong log backend
    }
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(value))
    } catch {
      // Trình duyệt chặn storage: vẫn chạy được, chỉ mất dữ liệu khi tải lại trang.
    }
    return value
  },
  /** Đọc lại thông tin đã lưu, không có thì trả về null. */
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_KEY))
    } catch {
      return null
    }
  },
  /** Xoá sau khi xác thực thành công. */
  clear() {
    try {
      sessionStorage.removeItem(PENDING_KEY)
    } catch {
      // bỏ qua
    }
  },
}
