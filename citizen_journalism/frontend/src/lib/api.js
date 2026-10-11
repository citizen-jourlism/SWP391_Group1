import axios from 'axios'
import { tokenStorage } from './tokenStorage'

/**
 * "Cổng" DUY NHẤT để frontend gọi backend. Mọi file trong src/services/ đều dùng biến `api` này.
 *
 * - baseURL '/api': gọi api.post('/auth/register') thì thực tế là POST http://localhost:5173/api/auth/register.
 *   Vite (vite.config.js, mục proxy) sẽ chuyển tiếp mọi đường dẫn /api sang backend http://localhost:8080.
 *   Nhờ vậy không bị lỗi CORS và không phải ghi cứng địa chỉ backend ở khắp nơi.
 * - timeout 15 giây: backend không trả lời thì báo lỗi, tránh để người dùng chờ mãi.
 *
 * TẠI SAO gom về 1 chỗ? Việc gắn token đăng nhập và xử lý lỗi chung chỉ cần viết 1 lần ở đây,
 * mọi trang tự được hưởng.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

/**
 * Hàm sẽ được gọi khi backend báo 401 cho một request CÓ gửi token (token hết hạn / không hợp lệ).
 * AuthProvider đăng ký hàm đăng xuất vào đây (xem context/AuthProvider.jsx).
 * TẠI SAO không import thẳng AuthProvider? Tránh 2 file phụ thuộc vòng tròn vào nhau.
 */
let onUnauthorized = null
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler
}

/**
 * Interceptor REQUEST: chạy TRƯỚC khi gửi mỗi request.
 * Có token thì tự gắn header "Authorization: Bearer <token>", các trang không phải tự làm.
 */
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Interceptor RESPONSE = "trạm kiểm soát" chạy trước khi kết quả tới tay code gọi API.
 *  - Thành công: trả thẳng body { success, message, data } (bỏ lớp vỏ của axios), để code gọn hơn.
 *  - Thất bại: LUÔN trả về object { status, message, code, errors } cùng một dạng, kể cả khi mất mạng,
 *    để các trang (và hook useForm) xử lý lỗi theo một cách duy nhất.
 */
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status ?? 0 // 0 = không kết nối được tới server
    const body = error.response?.data // Body lỗi từ backend (ApiResponse), có thể không có nếu mất mạng

    // Request có gửi token mà vẫn bị 401 -> token hết hạn/không hợp lệ -> tự đăng xuất.
    // (401 khi đăng nhập sai mật khẩu thì không có token nên không bị ảnh hưởng.)
    if (status === 401 && error.config?.headers?.Authorization) onUnauthorized?.()

    return Promise.reject({
      status,
      message:
        body?.message ??
        (error.response
          ? 'Đã có lỗi xảy ra, vui lòng thử lại.'
          : 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.'),
      code: body?.code ?? null, // Mã lỗi cho máy đọc, ví dụ 'ACCOUNT_NOT_VERIFIED' (xem backend ErrorCode.java)
      errors: body?.errors ?? {}, // Lỗi theo từng ô nhập, ví dụ { email: 'Email không đúng định dạng.' }
    })
  },
)

export default api
