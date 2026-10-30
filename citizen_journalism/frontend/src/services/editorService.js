import api from '../lib/api'
import { cleanParams } from '../lib/payload'

/**
 * API BÀN LÀM VIỆC BIÊN TẬP VIÊN (backend: EditorController.java, chỉ vai trò EDITOR).
 */
export const editorService = {
  getOverview: () => api.get('/editor/overview'),

  // ----- Hàng đợi tin bài -----
  listSubmissions: (params) => api.get('/editor/submissions', { params: cleanParams(params) }),
  getSubmission: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}`),

  // ----- Từ chối hồ sơ (Reject Submission), xem routes/editor/EditorRejectSubmission.jsx -----
  /** { submission, reporter, screening, rejectable, penaltyPoints, review } */
  getRejection: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/rejection`),
  /** payload = { reason, feedback, internalNote, applyPenalty } -> trả về dữ liệu mới (cùng dạng getRejection) */
  rejectSubmission: (code, payload) => api.post(`/editor/submissions/${encodeURIComponent(code)}/reject`, payload),
  /** Hàng đợi gộp: hồ sơ phản ánh + bài nghiên cứu Chuyên gia đã nộp. type: HOT_NEWS | COMPLAINT | INVESTIGATION | RESEARCH */
  listQueue: (params) => api.get('/editor/queue', { params: cleanParams(params) }),
  /** Danh sách lĩnh vực cho ô lọc "Lĩnh vực" của hàng đợi. */
  listQueueFields: () => api.get('/editor/queue/fields'),
  /** Chi tiết 1 bài nghiên cứu Chuyên gia đã nộp: { article, author }. */
  getResearch: (id) => api.get(`/editor/research/${id}`),
  /** Gửi bản chỉnh sửa { title, abstractText, keywords, content } cho Chuyên gia duyệt. */
  requestRevision: (id, values) => api.post(`/editor/research/${id}/revision-requests`, values),
  /** Duyệt bài nghiên cứu, chuyển Phó TBT phụ trách lĩnh vực. values = { conflict, mention, note } (điểm do backend tính). */
  approveResearch: (id, values) => api.post(`/editor/research/${id}/approve`, values),
  /** Từ chối bài nghiên cứu (bài dừng xử lý), reason bắt buộc. */
  rejectResearch: (id, reason) => api.post(`/editor/research/${id}/reject`, { reason }),
  /** Trả lời trong khung trao đổi của 1 yêu cầu chỉnh sửa đang chờ (revisionId = id yêu cầu, không phải id bài). */
  commentRevision: (revisionId, content) => api.post(`/editor/research/revisions/${revisionId}/comments`, { content }),

  // ----- Biên tập bài viết: bài nghiên cứu đã nộp + tình trạng biên tập -----
  /** params: { editStatus: NOT_EDITED | PENDING | ACCEPTED | REJECTED, field, q (tìm trong tiêu đề), page, size } */
  listArticles: (params) => api.get('/editor/articles', { params: cleanParams(params) }),

  // ----- Kiểm tra tin trùng (Check for Duplication) — backend CHƯA có, xem routes/editor/EditorDuplicateCheck.jsx -----
  getDuplicates: (code) => api.get(`/editor/submissions/${encodeURIComponent(code)}/duplicates`),
  /** Gộp hồ sơ `code` vào hồ sơ gốc `originalCode` (submissions.duplicate_submission_id = id hồ sơ gốc). */
  mergeDuplicate: (code, originalCode, note) =>
    api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/merge`, { originalCode, note }),
  /** Xác nhận không trùng: bỏ qua gợi ý của AI, hồ sơ xử lý như sự việc mới. */
  dismissDuplicates: (code, note) => api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/dismiss`, { note }),
  /** Hoàn tác gộp: hồ sơ quay lại hàng đợi như trước khi gộp. */
  unmergeDuplicate: (code) => api.post(`/editor/submissions/${encodeURIComponent(code)}/duplicates/unmerge`),

  // ----- Giao nhiệm vụ xác minh hiện trường (backend: FieldAssignmentController) -----
  /** Cộng tác viên để chọn. params: { code, province, ward, q, minScore, sort: RECOMMENDED | SCORE_DESC | SCORE_ASC | WORKLOAD } */
  listCandidates: (params) => api.get('/editor/assignments/candidates', { params: cleanParams(params) }),
  /** Nhiệm vụ mới nhất của 1 hồ sơ; data = null nếu hồ sơ chưa từng được giao. */
  getLatestAssignment: (code) => api.get('/editor/assignments/latest', { params: { code } }),
  /** Lịch sử nhiệm vụ của 1 hồ sơ, xem components/editor/AssignmentHistoryDialog.jsx. */
  getAssignmentHistory: (code) => api.get('/editor/assignments/history', { params: { code } }),
  /** Mỗi hồ sơ 1 dòng, là nhiệm vụ mới nhất. params: { status, page, size } */
  listAssignments: (params) => api.get('/editor/assignments', { params: cleanParams(params) }),
  /** payload: { trackingCode, contributorId, deadline, note } */
  assign: (payload) => api.post('/editor/assignments', payload),
  /** Báo cáo hiện trường CTV đã nộp cho 1 nhiệm vụ. */
  getAssignmentReport: (id) => api.get(`/editor/assignments/${id}/report`),
  /** Phản hồi báo cáo: trả về báo cáo mới nhất. reason là nội dung yêu cầu gửi Cộng tác viên. */
  requestReportRevision: (id, reason) => api.post(`/editor/assignments/${id}/report/revision`, { reason }),
  requestReportEvidence: (id, reason) => api.post(`/editor/assignments/${id}/report/evidence`, { reason }),
  approveReport: (id) => api.post(`/editor/assignments/${id}/report/approve`),
  cancelAssignment: (id, reason) => api.post(`/editor/assignments/${id}/cancel`, { reason }),

  // ----- Đơn đăng ký Cộng tác viên -----
  listApplications: (params) => api.get('/editor/applications', { params: cleanParams(params) }),
  getApplication: (id) => api.get(`/editor/applications/${id}`),
  /** decision: 'FORWARD' (chuyển Phó TBT) | 'REJECT' (từ chối, bắt buộc có note) */
  reviewApplication: (id, decision, note) => api.post(`/editor/applications/${id}/review`, { decision, note }),
  documentPath: (id, index) => `/editor/applications/${id}/documents/${index}`,
}
