/**
 * Dữ liệu dùng chung cho chức năng DUYỆT KẾT QUẢ XÁC MINH (Review Verification Result, Biên tập viên):
 * màn routes/editor/EditorVerificationReview.jsx.
 *
 * Màn này dùng SAU KHI Cộng tác viên xác minh thực địa và nộp bài + báo cáo. Biên tập viên đánh giá 5 tiêu chí:
 *   - Tất cả Đạt  -> POST .../verification-review, hồ sơ chuyển "Chờ Phó TBT duyệt". Backend ghi editorial_reviews
 *                    (action APPROVE, comments = kết quả từng tiêu chí + ghi chú gửi Phó TBT), không thêm cột / bảng mới.
 *   - Có Chưa đạt -> không lưu gì, Biên tập viên chuyển sang Yêu cầu bổ sung hoặc Từ chối hồ sơ.
 */

/** 5 tiêu chí, key khớp enum VerificationReviewRequest.Criterion ở backend. */
export const REVIEW_CRITERIA = [
  {
    key: 'CONTENT',
    label: 'Tiêu đề & nội dung bài CTV',
    hint: 'Tiêu đề đúng sự việc, sapo rõ ràng, không lỗi chính tả, không lộ thông tin cá nhân của người gửi tin.',
  },
  {
    key: 'ORIGIN',
    label: 'Khớp với tin gốc',
    hint: 'Bài CTV đúng sự việc người gửi phản ánh (địa điểm, thời gian, diễn biến), không thêm chi tiết chưa kiểm chứng.',
  },
  {
    key: 'FIELD_EVIDENCE',
    label: 'Bằng chứng thực địa',
    hint: 'Ảnh / video của CTV có GPS và giờ chụp khớp hiện trường, không có dấu hiệu chỉnh sửa, nộp đúng hạn.',
  },
  {
    key: 'SCREENING',
    label: 'Kết quả sàng lọc',
    hint: 'Không bị đánh dấu tin rác, các cảnh báo tin trùng đã được kiểm tra.',
  },
  {
    key: 'LEGAL',
    label: 'Pháp lý & quyền riêng tư',
    hint: 'Không nêu đích danh khi chưa xác minh, che biển số / khuôn mặt nếu cần, có đồng ý của người được trích dẫn.',
  },
]

/** Giới hạn ô nhập, khớp backend (VerificationReviewRequest). */
export const VERIFICATION_REVIEW_LIMITS = { issueMax: 300, noteMax: 1000 }

/** Mức ưu tiên của hồ sơ (submissions.priority). */
export const PRIORITY_LABELS = {
  LOW: { label: 'Thấp', tone: 'green' },
  MEDIUM: { label: 'Trung bình', tone: 'blue' },
  HIGH: { label: 'Cao', tone: 'orange' },
  BREAKING: { label: 'Khẩn cấp', tone: 'red' },
}

/** Trạng thái nhiệm vụ xác minh (field_assignments.status). */
export const ASSIGNMENT_STATUS = {
  OPEN: { label: 'Chờ CTV nhận', tone: 'neutral' },
  ASSIGNED: { label: 'Đã giao', tone: 'blue' },
  ACCEPTED: { label: 'CTV đã nhận', tone: 'blue' },
  CANCELLED: { label: 'Đã huỷ', tone: 'red' },
  COMPLETED: { label: 'Hoàn thành', tone: 'green' },
}

export const ASSIGNMENT_MODE = { DIRECT: 'Chỉ định', BROADCAST: 'Mở cho mạng lưới' }

/**
 * Kiểm tra trước khi chuyển. results = { [key]: { value: 'PASS' | 'FAIL' | '', issue } }.
 * Trả về { missing, failed, issueErrors: { key: lỗi }, note }.
 */
export const validateVerificationReview = (results, note) => {
  const missing = REVIEW_CRITERIA.filter((item) => !results[item.key]?.value).map((item) => item.key)
  const failed = REVIEW_CRITERIA.filter((item) => results[item.key]?.value === 'FAIL').map((item) => item.key)
  const issueErrors = {}
  REVIEW_CRITERIA.forEach(({ key }) => {
    const issue = results[key]?.issue?.trim() ?? ''
    if (results[key]?.value === 'FAIL' && !issue) issueErrors[key] = 'Vui lòng ghi vấn đề cần xử lý.'
    else if (issue.length > VERIFICATION_REVIEW_LIMITS.issueMax) {
      issueErrors[key] = `Tối đa ${VERIFICATION_REVIEW_LIMITS.issueMax} ký tự.`
    }
  })
  return {
    missing,
    failed,
    issueErrors,
    note: note.trim().length > VERIFICATION_REVIEW_LIMITS.noteMax ? `Ghi chú tối đa ${VERIFICATION_REVIEW_LIMITS.noteMax} ký tự.` : '',
  }
}

/** Toạ độ GPS hiển thị "10.7942, 106.7203"; null nếu tệp không có GPS. */
export const formatGps = (evidence) =>
  evidence.latitude == null || evidence.longitude == null
    ? null
    : `${evidence.latitude.toFixed(4)}, ${evidence.longitude.toFixed(4)}`
