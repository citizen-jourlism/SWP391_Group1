import api from '../lib/api'

/**
 * Các lời gọi API của KHU QUẢN TRỊ (backend: AdminController.java). Chỉ tài khoản SYSTEM_ADMIN gọi được.
 */
export const adminService = {
  getStats: () => api.get('/admin/stats'),

  /**
   * Danh sách tài khoản có tìm kiếm / lọc / phân trang.
   * params = { keyword, role, status, page, size }; giá trị rỗng sẽ không được gửi (= không lọc).
   * axios tự ghép params thành ?keyword=...&page=0...
   */
  searchUsers: (params) =>
    api.get('/admin/users', {
      params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null)),
    }),

  createUser: (payload) => api.post('/admin/users', payload), // { fullName, email, phone, role, password }
  updateStatus: (userId, status) => api.patch(`/admin/users/${userId}/status`, { status }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  // Trả về mật khẩu tạm trong response.data (chỉ lần này); adminPassword = mật khẩu của chính admin
  resetPassword: (userId, adminPassword) => api.post(`/admin/users/${userId}/reset-password`, { adminPassword }),
  updateUser: (userId, payload) => api.put(`/admin/users/${userId}`, payload), // { fullName, phone, citizenId, address, dateOfBirth, role }
}
