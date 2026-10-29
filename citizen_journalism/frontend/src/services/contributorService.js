import api from '../lib/api'

/**
 * API ĐĂNG KÝ / THEO DÕI ĐƠN CỘNG TÁC VIÊN của người đang đăng nhập (backend: ContributorApplicationController.java).
 */
export const contributorService = {
  /** { role, eligibility: { eligible, checks }, current, history, options } */
  getOverview: () => api.get('/contributor-applications/me'),

  /**
   * Nộp đơn: multipart gồm "data" (JSON các ô chữ) + "files" (giấy tờ). Cách đóng gói giống submissionService.create.
   */
  apply: (data, files) => {
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    files.forEach((file) => formData.append('files', file))
    return api.post('/contributor-applications', formData, { timeout: 0 })
  },

  withdraw: (id) => api.post(`/contributor-applications/${id}/withdraw`),

  /** Đường dẫn API xem lại giấy tờ (dùng với openProtectedFile trong lib/files.js). */
  documentPath: (id, index) => `/contributor-applications/${id}/documents/${index}`,
}
