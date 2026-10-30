import api from '../lib/api'

/**
 * Các lời gọi API KIỂM TRA TIN TRÙNG (UC Editor "Check for Duplication") — backend CHƯA có.
 * Dùng ở: routes/editor/EditorDuplicateCheck.jsx. Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const screeningService = {
  /** Kết quả sàng lọc AI + danh sách hồ sơ nghi trùng: { submission, screening, candidates, review } */
  getDuplicates: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/duplicates`),
  /** Gộp hồ sơ `code` vào hồ sơ gốc `originalCode` (submissions.duplicate_submission_id = id hồ sơ gốc). */
  mergeDuplicate: (code, originalCode, note) =>
    api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/merge`, { originalCode, note }),
  /** Xác nhận không trùng: bỏ qua gợi ý của AI, hồ sơ xử lý như sự việc mới. */
  dismissDuplicates: (code, note) => api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/dismiss`, { note }),
  /** Hoàn tác gộp: hồ sơ quay lại hàng đợi như trước khi gộp. */
  unmergeDuplicate: (code) => api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/unmerge`),
}
