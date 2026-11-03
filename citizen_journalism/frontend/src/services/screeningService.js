import api from '../lib/api'

/**
 * Các lời gọi API KIỂM TRA TIN TRÙNG (UC Editor "Check for Duplication").
 * Backend: EditorController -> DuplicateReviewService (AI quét bằng RAG: DuplicateDetectionService).
 * Dùng ở: routes/editor/EditorDuplicateCheck.jsx. Tách riêng khỏi editorService.js để không đụng file chung của bàn BTV.
 */
export const screeningService = {
  /** Kết quả sàng lọc AI + danh sách hồ sơ nghi trùng: { submission, screening, candidates, review } */
  getDuplicates: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/duplicates`),
  /** Ghi nhận hồ sơ `code` trùng sự việc với hồ sơ `originalCode` (chỉ lưu kết luận, không gộp dữ liệu). */
  confirmDuplicate: (code, originalCode, note) =>
    api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/confirm`, { originalCode, note }),
  /** Ghi nhận không trùng: hồ sơ xử lý như sự việc mới. */
  dismissDuplicates: (code, note) => api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/dismiss`, { note }),
}
