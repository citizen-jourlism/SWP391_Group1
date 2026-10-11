import axios from 'axios'

/**
 * Axios dùng chung cho mọi lời gọi API.
 * - Thành công: trả thẳng body { success, message, data }.
 * - Thất bại: luôn reject một object { status, message, errors } để UI xử lý giống nhau.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const body = error.response?.data
    return Promise.reject({
      status: error.response?.status ?? 0,
      message:
        body?.message ??
        (error.response
          ? 'Đã có lỗi xảy ra, vui lòng thử lại.'
          : 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.'),
      errors: body?.errors ?? {},
    })
  },
)

export default api
