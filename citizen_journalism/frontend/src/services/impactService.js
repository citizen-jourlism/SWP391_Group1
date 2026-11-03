import api from '../lib/api'

/**
 * Các lời gọi API ĐÁNH GIÁ MỨC TÁC ĐỘNG (UC Editor "Assess Impact Score").
 * Backend: EditorController -> ImpactScoreService. Dùng ở: routes/editor/EditorImpactAssessment.jsx.
 * Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const impactService = {
  /** { submission, assessable, blockedReason, deputyName, assessment } (không có điểm số) */
  getAssessment: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/impact`),
  /** body: { area, people, nature, sensitive, sensitiveReason, note } -> cùng dạng GET + message */
  assess: (code, body) => api.post(`/editor/submissions/${encodeURIComponent(code)}/impact`, body),
}
