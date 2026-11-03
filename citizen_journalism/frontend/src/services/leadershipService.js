import api from '../lib/api'

/**
 * Các lời gọi API của BÀN DUYỆT BAN BIÊN TẬP (backend: LeadershipController.java -> LeadershipService.java).
 * Phó TBT / Tổng biên tập gọi được tất cả; Biên tập viên chỉ gọi được 2 hàm *Notes (đọc ý kiến của Ban biên tập).
 */

/** Bỏ tham số rỗng để không gửi lên (= không lọc). */
const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))

export const leadershipService = {
  /** params = { kind: SUBMISSION | RESEARCH, type: HOT_NEWS | COMPLAINT | INVESTIGATION, q, page, size } */
  listQueue: (params) => api.get('/leadership/queue', { params: cleanParams(params) }),

  getSubmission: (code) => api.get(`/leadership/submissions/${encodeURIComponent(code)}`),
  /** body = { decision: APPROVE | ESCALATE | REQUEST_EDIT | REJECT, note, breakingSigns: [...] } */
  decideSubmission: (code, body) => api.post(`/leadership/submissions/${encodeURIComponent(code)}/decision`, body),

  getResearch: (id) => api.get(`/leadership/research/${id}`),
  decideResearch: (id, body) => api.post(`/leadership/research/${id}/decision`, body),

  /** Ý kiến của Ban biên tập (mới nhất trước) — Biên tập viên xem để biết cần sửa gì. */
  submissionNotes: (code) => api.get(`/leadership/notes/submissions/${encodeURIComponent(code)}`),
  researchNotes: (id) => api.get(`/leadership/notes/research/${id}`),
}
