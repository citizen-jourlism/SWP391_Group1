import api from '../lib/api'

/**
 * Lời gọi API TIẾP NHẬN THẨM ĐỊNH (Biên tập viên nhận xử lý hồ sơ mới).
 * Backend: EditorController -> SubmissionReviewStartService. Dùng ở: routes/editor/EditorSubmissionDetail.jsx.
 * Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const reviewStartService = {
  /** Hồ sơ PENDING -> IN_REVIEW, BTV đang đăng nhập thành người phụ trách. Trả về SubmissionDetail mới. */
  startReview: (code) => api.post(`/editor/submissions/${encodeURIComponent(code)}/start-review`),
}
