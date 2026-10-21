import api from '../lib/api'
import { toMultipart } from '../lib/payload'

/**
 * API BÀI NGHIÊN CỨU + BẢN NHÁP của Chuyên gia (backend: ResearchController.java, chỉ vai trò EXPERT).
 */
export const researchService = {
  /** { fields, minTitleLength, minAbstractLength, minWords, maxImages, maxImageSizeMb, acceptedImageTypes, draftCount, submittedCount } */
  getOptions: () => api.get('/research/options'),

  /** status: 'DRAFT' (bản nháp) | 'SUBMITTED' (đã nộp) */
  list: (status, page = 0) => api.get('/research', { params: { status, page } }),

  get: (id) => api.get(`/research/${id}`),

  /**
   * Lưu nháp / nộp bài. id = null -> bài mới (POST), có id -> lưu tiếp (PUT).
   * Gửi multipart: "data" = JSON các ô chữ + danh sách ảnh; "files" = các ảnh MỚI theo thứ tự xuất hiện trong bài
   * (ảnh mới trong "data.images" có url = null, backend ghép lần lượt với từng tệp trong "files").
   */
  save: (id, data, newFiles) => {
    const formData = toMultipart(data, newFiles)
    const config = { timeout: 0 } // Ảnh có thể lớn: bỏ giới hạn 15 giây
    return id ? api.put(`/research/${id}`, formData, config) : api.post('/research', formData, config)
  },

  remove: (id) => api.delete(`/research/${id}`),
}
