import axios from 'axios'

/**
 * "Cổng" DUY NHẤT để frontend gọi backend. Mọi file trong src/services/ đều dùng biến `api` này.
 *
 * - baseURL '/api': gọi api.post('/auth/register') thì thực tế là POST http://localhost:5173/api/auth/register.
 *   Vite (vite.config.js, mục proxy) sẽ chuyển tiếp mọi đường dẫn /api sang backend http://localhost:8080.
 *   Nhờ vậy không bị lỗi CORS và không phải ghi cứng địa chỉ backend ở khắp nơi.
 * - timeout 15 giây: backend không trả lời thì báo lỗi, tránh để người dùng chờ mãi.
 *
 * TẠI SAO gom về 1 chỗ? Sau này thêm Đăng nhập chỉ cần sửa ở đây để TỰ ĐỘNG gắn token
 * vào mọi request, không phải sửa từng trang.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

/**
 * Interceptor = "trạm kiểm soát" chạy trước khi kết quả tới tay code gọi API.
 *  - Thành công: trả thẳng body { success, message, data } (bỏ lớp vỏ của axios), để code gọn hơn.
 *  - Thất bại: LUÔN trả về object { status, message, errors } cùng một dạng, kể cả khi mất mạng,
 *    để các trang (và hook useForm) xử lý lỗi theo một cách duy nhất.
 */
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const body = error.response?.data // Body lỗi từ backend (ApiResponse), có thể không có nếu mất mạng
    return Promise.reject({
      status: error.response?.status ?? 0, // 0 = không kết nối được tới server
      message:
        body?.message ??
        (error.response
          ? 'Đã có lỗi xảy ra, vui lòng thử lại.'
          : 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.'),
      errors: body?.errors ?? {}, // Lỗi theo từng ô nhập, ví dụ { email: 'Email không đúng định dạng.' }
    })
  },
)

export default api
