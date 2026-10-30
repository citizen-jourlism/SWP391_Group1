import api from '../lib/api'
import { MAIL_REQUEST } from './authService'

/**
 * Các lời gọi API về HỒ SƠ CÁ NHÂN của người đang đăng nhập (backend: UserController.java).
 * Tất cả đều cần token; lib/api.js tự gắn token vào header.
 */
export const userService = {
  getProfile: () => api.get('/users/me'),
  // payload = { fullName, phone, citizenId, address, dateOfBirth } (ô bỏ trống gửi null)
  updateProfile: (payload) => api.put('/users/me', payload),
  requestEmailChange: (email) => api.post('/users/me/email', { email }, MAIL_REQUEST),
  verifyEmailChange: (otp) => api.post('/users/me/email/verify', { otp }),

  /**
   * Gửi ảnh lên bằng FormData (dạng multipart/form-data, như form có <input type="file">).
   * Trường tên "file" khớp với @RequestParam("file") ở backend.
   * Không cần tự đặt Content-Type: trình duyệt tự thêm kèm "boundary" phân cách các phần.
   */
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/me/avatar', formData)
  },
  removeAvatar: () => api.delete('/users/me/avatar'),
}
