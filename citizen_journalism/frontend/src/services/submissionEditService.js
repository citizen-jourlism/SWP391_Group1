import api from '../lib/api'

/**
 * Biên tập viên sửa trực tiếp nội dung hồ sơ (backend: SubmissionEditController -> SubmissionEditService).
 * Lưu thẳng vào hồ sơ, không cần người gửi xác nhận. Trả về chi tiết hồ sơ sau khi sửa (giống GET /editor/submissions/{mã}).
 */
export const submissionEditService = {
  /** values = { title, summary, content } */
  editContent: (code, values) => api.put(`/editor/submissions/${encodeURIComponent(code)}/content`, values),
}
