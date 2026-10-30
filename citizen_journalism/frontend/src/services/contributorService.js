import api from '../lib/api'
import { toMultipart } from '../lib/payload'

/**
 * API ĐĂNG KÝ / THEO DÕI ĐƠN CỘNG TÁC VIÊN của người đang đăng nhập (backend: ContributorApplicationController.java).
 */
export const contributorService = {
  /** { role, eligibility: { eligible, checks }, current, history, options } */
  getOverview: () => api.get('/contributor-applications/me'),

  /** Nộp đơn: multipart gồm "data" (JSON các ô chữ) + "files" (giấy tờ), đóng gói bằng toMultipart (lib/payload.js). */
  apply: (data, files) => api.post('/contributor-applications', toMultipart(data, files), { timeout: 0 }),

  withdraw: (id) => api.post(`/contributor-applications/${id}/withdraw`),

  /** Đường dẫn API xem lại giấy tờ (dùng với openProtectedFile trong lib/files.js). */
  documentPath: (id, index) => `/contributor-applications/${id}/documents/${index}`,
}
