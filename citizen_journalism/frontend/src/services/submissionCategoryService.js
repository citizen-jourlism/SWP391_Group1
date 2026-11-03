import api from '../lib/api'

/**
 * API PHÂN LOẠI TIN (backend: SubmissionCategoryController.java, chỉ EDITOR).
 * Dùng ở: components/editor/SubmissionCategoryPanel.jsx. Tách riêng khỏi editorService.js để không đụng file chung.
 */
export const submissionCategoryService = {
  /** { categoryId, categoryName, deputyName, editable, options: [{ id, name, deputyName }] } */
  get: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/category`),
  /** Phân loại / đổi chuyên mục, trả về dữ liệu mới cùng dạng get. */
  classify: (code, categoryId) => api.put(`/editor/submissions/${encodeURIComponent(code)}/category`, { categoryId }),
}
