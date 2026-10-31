/**
 * Dữ liệu dùng chung cho chức năng HUỶ HỒ SƠ ĐANG CHỜ XỬ LÝ (người gửi tự huỷ hồ sơ khi toà soạn chưa xử lý).
 * Dùng ở: components/submission/CancelSubmissionPanel.jsx, CancelSubmissionDialog.jsx.
 * Giá trị (value) khớp enum CancelReason ở backend.
 */

/** Ghi chú gửi toà soạn tối đa bao nhiêu ký tự, khớp backend (CancelSubmissionRequest). */
export const CANCEL_NOTE_MAX = 500

/** Lý do huỷ. expertOnly: chỉ Chuyên gia mới thấy (backend cũng chặn vai trò khác). */
export const CANCEL_REASONS = [
  { value: 'DUPLICATE', label: 'Gửi nhầm hoặc gửi trùng hồ sơ khác' },
  { value: 'INACCURATE', label: 'Thông tin chưa chính xác, sẽ gửi lại' },
  { value: 'RESOLVED', label: 'Sự việc đã được giải quyết' },
  { value: 'NO_LONGER_NEEDED', label: 'Không muốn tiếp tục phản ánh' },
  { value: 'TO_ARTICLE', label: 'Chuyển thành bài phân tích chuyên môn', expertOnly: true },
  { value: 'OTHER', label: 'Lý do khác' },
]

/** Danh sách lý do theo vai trò người đang đăng nhập (Chuyên gia có thêm lý do riêng). */
export const cancelReasonsFor = (role) => CANCEL_REASONS.filter((reason) => !reason.expertOnly || role === 'EXPERT')

/**
 * Thông tin lần huỷ, đọc từ NHẬT KÝ XỬ LÝ (DB không có cột riêng cho lý do huỷ):
 * bước cuối có status CANCELLED, mô tả dạng "Người gửi đã huỷ hồ sơ: <tên lý do>.", note = ghi chú người gửi.
 * Hồ sơ chưa bị huỷ -> null.
 *
 * @returns {{ reasonLabel: string, note: string|null, cancelledAt: string } | null}
 */
export const findCancellation = (detail) => {
  if (detail.status !== 'CANCELLED') return null
  const entry = detail.timeline.findLast((item) => item.status === 'CANCELLED')
  if (!entry) return null
  const reason = CANCEL_REASONS.find((item) => entry.description?.includes(item.label))
  return { reasonLabel: reason?.label ?? 'Người gửi huỷ', note: entry.note, cancelledAt: entry.createdAt }
}
