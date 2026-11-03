
import api from '../lib/api'

/**
 * TungTT - API xét duyệt đơn đăng ký Cộng tác viên.
 * Chỉ Phó Tổng Biên tập được phép gọi các API này.
 */
export const deputyContributorService = {
  // Lấy các đơn đang chờ Phó Tổng Biên tập.
  list: ({ page = 0, size = 10 } = {}) =>
    api.get('/deputy/contributor-applications', {
      params: { page, size },
    }),

  // Lấy thông tin chi tiết đơn và người đăng ký.
  get: (id) =>
    api.get(
      `/deputy/contributor-applications/${encodeURIComponent(id)}`
    ),

  /**
   * Gửi quyết định xét duyệt.
   *
   * APPROVE: { decision, note }
   * REJECT: { decision, rejectionReason,
   *           missingInformation, improvementRequest }
   */
  review: (id, payload) =>
    api.post(
      `/deputy/contributor-applications/${encodeURIComponent(id)}/review`,
      payload
    ),

  // Xem giấy tờ qua endpoint có kiểm tra quyền.
  documentPath: (id, index) =>
    `/deputy/contributor-applications/${encodeURIComponent(id)}/documents/${index}`,
}
