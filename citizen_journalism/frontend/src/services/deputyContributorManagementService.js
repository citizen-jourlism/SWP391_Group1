
import api from '../lib/api'

/**
 * TungTT - Iteration 3 - Task 2.
 *
 * Gọi API quản lý danh sách Cộng tác viên.
 * Chỉ sử dụng GET, không thay đổi dữ liệu.
 */
export const deputyContributorManagementService = {
  // Danh sách CTV, có tìm kiếm và phân trang.
  list: ({ keyword = '', page = 0, size = 10 } = {}) =>
    api.get('/leadership/contributor-management', {
      params: {
        keyword: keyword.trim() || undefined,
        page,
        size,
      },
    }),

  // Xem thông tin chi tiết một CTV.
  get: (id) =>
    api.get(
      `/leadership/contributor-management/${encodeURIComponent(id)}`
    ),
}
