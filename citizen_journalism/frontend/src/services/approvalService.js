import api from '../lib/api'

/**
 * Các lời gọi API DUYỆT TIN NÓNG (Approve Breaking News, Biên tập viên).
 * Backend: EditorController -> SubmissionApprovalService. Dùng ở: components/editor/ApproveSubmissionDialog.jsx.
 * Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const approvalService = {
  /** { submission, approvable, blockedReason, deputyName, approval } — xem chú thích đầu ApproveSubmissionDialog.jsx */
  getApproval: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/approval`),
  /** payload = { note } -> trả về dữ liệu mới (cùng dạng getApproval), hồ sơ chuyển "Chờ Phó TBT duyệt" */
  approve: (code, payload) => api.post(`/editor/submissions/${encodeURIComponent(code)}/approve`, payload),
}
