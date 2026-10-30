import api from '../lib/api'

/**
 * Các lời gọi API YÊU CẦU BỔ SUNG THÔNG TIN (Request Additional Information, Biên tập viên).
 * Backend: EditorController -> SubmissionInfoRequestService. Dùng ở: routes/editor/EditorRequestInfo.jsx. Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const infoRequestService = {
  /** { submission, reporter, requestable, request } — xem chú thích đầu EditorRequestInfo.jsx */
  getInfoRequest: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/info-request`),
  /** payload = { message, items, internalNote } -> trả về dữ liệu mới (cùng dạng getInfoRequest) */
  requestInfo: (code, payload) => api.post(`/editor/submissions/${encodeURIComponent(code)}/request-info`, payload),
}
