import api from '../lib/api'
import { cleanParams, toMultipart } from '../lib/payload'

/**
 * API NHIỆM VỤ XÁC MINH của Cộng tác viên đang đăng nhập (backend: ContributorTaskController.java).
 */
export const contributorTaskService = {
  /** params: { status, page, size } */
  list: (params) => api.get('/contributor/tasks', { params: cleanParams(params) }),
  /** Số nhiệm vụ theo trạng thái: { ASSIGNED: 2, ACCEPTED: 1, ... } (trạng thái chưa có nhiệm vụ thì không xuất hiện). */
  counts: () => api.get('/contributor/tasks/counts'),
  get: (id) => api.get(`/contributor/tasks/${id}`),
  accept: (id) => api.post(`/contributor/tasks/${id}/accept`),
  decline: (id, reason) => api.post(`/contributor/tasks/${id}/decline`, { reason }),
  cancel: (id, reason) => api.post(`/contributor/tasks/${id}/cancel`, { reason }),
  /** Nộp báo cáo: multipart gồm "data" (JSON các ô chữ) + "files" (tư liệu). timeout 0: tệp lớn có thể tải lên lâu. */
  submitReport: (id, data, files) => api.post(`/contributor/tasks/${id}/report`, toMultipart(data, files), { timeout: 0 }),
}
