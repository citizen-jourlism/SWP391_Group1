import api from '../lib/api'

/**
 * Các lời gọi API DUYỆT KẾT QUẢ XÁC MINH (Review Verification Result, Biên tập viên).
 * Backend: EditorController -> SubmissionVerificationReviewService. Dùng ở: routes/editor/EditorVerificationReview.jsx.
 * Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const verificationReviewService = {
  /** { submission, priority, impactScore, categoryName, deputyName, reporter, assignment, report, screening, reviewable, blockedReason, review } */
  getReview: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/verification-review`),
  /** payload = { checks: [{ criterion, passed, issue }], note } -> dữ liệu mới (cùng dạng getReview), hồ sơ chuyển "Chờ Phó TBT duyệt" */
  submitReview: (code, payload) => api.post(`/editor/submissions/${encodeURIComponent(code)}/verification-review`, payload),
}
