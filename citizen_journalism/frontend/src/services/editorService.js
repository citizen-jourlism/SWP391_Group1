import api from '../lib/api'
import { cleanParams } from '../lib/payload'

/**
 * API BÀN LÀM VIỆC BIÊN TẬP VIÊN (backend: EditorController.java, chỉ vai trò EDITOR).
 */
export const editorService = {
  getOverview: () => api.get('/editor/overview'),

  // ----- Hàng đợi tin bài -----
  listSubmissions: (params) => api.get('/editor/submissions', { params: cleanParams(params) }),
  getSubmission: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}`),
  reviewReputationSubmission: (code, payload) => api.post(`/editor/reputation/submissions/${encodeURIComponent(code)}/review`, payload),

  // ----- Uy tín và xử phạt -----
  listReputationAccounts: (params) => api.get('/editor/reputation/accounts', { params: cleanParams(params) }),
  getReputationAccount: (id) => api.get(`/editor/reputation/accounts/${encodeURIComponent(id)}`),
  listAccountSubmissions: (id, params) => api.get(`/editor/reputation/accounts/${encodeURIComponent(id)}/submissions`, { params: cleanParams(params) }),
  listAccountResearch: (id, params) => api.get(`/editor/reputation/accounts/${encodeURIComponent(id)}/research`, { params: cleanParams(params) }),
  reviewResearchReputation: (id, payload) => api.post(`/editor/reputation/research/${id}/review`, payload),

  // ----- Đơn đăng ký Cộng tác viên -----
  listApplications: (params) => api.get('/editor/applications', { params: cleanParams(params) }),
  getApplication: (id) => api.get(`/editor/applications/${id}`),
  /** decision: 'FORWARD' (chuyển Phó TBT) | 'REJECT' (từ chối, bắt buộc có note) */
  reviewApplication: (id, decision, note) => api.post(`/editor/applications/${id}/review`, { decision, note }),
  documentPath: (id, index) => `/editor/applications/${id}/documents/${index}`,

  // ----- Duyệt bài nghiên cứu của chuyên gia -----
  getReputationResearch: (id) => api.get(`/editor/reputation/research/${id}`),
}
