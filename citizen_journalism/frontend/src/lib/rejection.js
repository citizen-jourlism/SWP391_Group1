/**
 * Dữ liệu dùng chung cho chức năng TỪ CHỐI HỒ SƠ (Reject Submission, Biên tập viên):
 * màn routes/editor/EditorRejectSubmission.jsx và hộp phản hồi phía người gửi components/submission/RejectionCard.jsx.
 *
 * DB không có cột riêng cho lý do từ chối. Khi Biên tập viên xác nhận, backend ghi:
 *   - submissions.status = REJECTED
 *   - submission_events: status REJECTED, actor EDITOR, description "Không tiếp nhận hồ sơ: <tên lý do>", note = phản hồi gửi người gửi
 *   - editorial_reviews: review_role EDITOR, action REJECT, comments = "[<mã lý do>] <ghi chú nội bộ>"
 *   - (lý do tin rác + có tick trừ điểm) reputation_logs: points_change = -SPAM_PENALTY, reason SPAM_REPORTED;
 *     users.reputation_score giảm tương ứng
 */

/** Các lý do từ chối. template(code): câu phản hồi gợi ý, Biên tập viên sửa được trước khi gửi. */
export const REJECT_REASONS = [
  {
    value: 'SPAM',
    label: 'Tin rác, quảng cáo',
    hint: 'Nội dung nhằm bán hàng, quảng cáo, hoặc gửi lặp lại nhiều lần.',
    template: (code) =>
      `Chào bạn, toà soạn đã xem hồ sơ ${code}. Nội dung mang tính quảng cáo, bán hàng hoặc được gửi lặp lại nhiều lần nên toà soạn không thể tiếp nhận.\nNếu bạn có thông tin thật về sự việc, hãy gửi hồ sơ mới với địa chỉ, thời điểm cụ thể và tư liệu kèm theo, không kèm nội dung quảng cáo.`,
  },
  {
    value: 'INSUFFICIENT',
    label: 'Thiếu thông tin, không thể xác minh',
    hint: 'Không có thời gian, địa điểm cụ thể hoặc tư liệu, người gửi không thể bổ sung.',
    template: (code) =>
      `Chào bạn, hồ sơ ${code} chưa có địa chỉ, thời điểm và tư liệu cụ thể nên toà soạn chưa thể xác minh. Bạn có thể gửi hồ sơ mới kèm các thông tin này.`,
  },
  {
    value: 'OUT_OF_SCOPE',
    label: 'Ngoài phạm vi tiếp nhận',
    hint: 'Việc riêng tư, tranh chấp dân sự cá nhân hoặc không thuộc lĩnh vực dân sinh.',
    template: (code) =>
      `Chào bạn, nội dung hồ sơ ${code} thuộc phạm vi riêng tư / tranh chấp cá nhân, không thuộc lĩnh vực dân sinh mà toà soạn tiếp nhận. Bạn nên liên hệ cơ quan có thẩm quyền tại địa phương.`,
  },
  {
    value: 'INAPPROPRIATE',
    label: 'Nội dung vi phạm',
    hint: 'Xúc phạm, kích động, thông tin cá nhân của người khác hoặc trái pháp luật.',
    template: (code) =>
      `Chào bạn, hồ sơ ${code} có nội dung không phù hợp với quy định đăng tải của toà soạn (xúc phạm, kích động hoặc chứa thông tin cá nhân của người khác) nên không được tiếp nhận.`,
  },
  {
    value: 'OTHER',
    label: 'Lý do khác',
    hint: 'Nêu rõ lý do trong phần phản hồi bên dưới.',
    template: () => '',
  },
]

/** Tra nhanh theo mã, ví dụ REJECT_REASON_BY_VALUE.SPAM.label */
export const REJECT_REASON_BY_VALUE = Object.fromEntries(REJECT_REASONS.map((item) => [item.value, item]))

/** Biên tập viên chỉ từ chối được hồ sơ còn ở bước biên tập. */
export const REJECTABLE_STATUSES = ['PENDING', 'IN_REVIEW', 'NEED_MORE_INFO']

/** Giới hạn form: phản hồi gửi người gửi (bắt buộc) và ghi chú nội bộ (không bắt buộc). */
export const REJECT_LIMITS = { feedbackMin: 20, feedbackMax: 1000, noteMax: 500 }

/** Số điểm uy tín trừ khi từ chối vì tin rác (reputation_logs.reason = SPAM_REPORTED). */
export const SPAM_PENALTY = 10

/** Kiểm tra form, trả về { reason, feedback, note } (chuỗi lỗi, '' nếu hợp lệ). */
export const validateRejection = ({ reason, feedback, note }) => {
  const feedbackLength = feedback.trim().length
  return {
    reason: reason ? '' : 'Vui lòng chọn lý do từ chối.',
    feedback:
      feedbackLength < REJECT_LIMITS.feedbackMin
        ? `Phản hồi cần tối thiểu ${REJECT_LIMITS.feedbackMin} ký tự.`
        : feedbackLength > REJECT_LIMITS.feedbackMax
          ? `Phản hồi tối đa ${REJECT_LIMITS.feedbackMax} ký tự.`
          : '',
    note: note.trim().length > REJECT_LIMITS.noteMax ? `Ghi chú tối đa ${REJECT_LIMITS.noteMax} ký tự.` : '',
  }
}
