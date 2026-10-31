import api from '../lib/api'

/**
 * API LỊCH SỬ CHỈNH SỬA hồ sơ của tôi (backend: SubmissionHistoryController.java, cần đăng nhập, đúng chủ hồ sơ).
 * Tách file riêng thay vì thêm vào submissionService.js để không đụng file dùng chung.
 */
export const historyService = {
  /**
   * Các phiên bản của 1 hồ sơ: { trackingCode, category, title, status, createdAt, revisions: [...] }.
   * revisions[0] = bản gốc; mỗi phần tử sau = 1 lần bổ sung (chỉ chứa phần thêm mới), xem lib/revisionHistory.js.
   */
  getMine: (trackingCode) => api.get(`/submissions/mine/${encodeURIComponent(trackingCode)}/history`),
}
