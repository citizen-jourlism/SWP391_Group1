/**
 * Dữ liệu hiển thị dùng chung cho chức năng ĐĂNG KÝ CỘNG TÁC VIÊN (người dân) và XÉT DUYỆT ĐƠN (Biên tập viên).
 * Giá trị khớp enum ở backend: ContributorApplication.Status, ContributorApplication.Availability.
 */

/** Các bước xét duyệt: dùng với components/submission/ProcessSteps (prop stages). */
export const APPLICATION_STAGES = [
  { title: 'Nộp đơn', description: 'Đơn và giấy tờ đã gửi tới toà soạn.' },
  { title: 'Biên tập viên xét duyệt', description: 'Kiểm tra hồ sơ, giấy tờ và mức độ tích cực.' },
  { title: 'Phó TBT phê duyệt', description: 'Quyết định chính thức của Ban biên tập.' },
  { title: 'Trở thành CTV', description: 'Tài khoản được nâng cấp lên Cộng tác viên.' },
]

/**
 * Trạng thái đơn:
 *   - label / tone : chữ + màu nhãn (Badge)
 *   - hint         : 1 câu giải thích cho người nộp
 */
export const APPLICATION_STATUS = {
  PENDING_EDITOR: { label: 'Chờ Biên tập viên xét', tone: 'blue', hint: 'Đơn đang chờ Biên tập viên kiểm tra hồ sơ.' },
  PENDING_DEPUTY: { label: 'Chờ Phó TBT phê duyệt', tone: 'purple', hint: 'Biên tập viên đã chấp thuận, đơn đang chờ Phó Tổng biên tập.' },
  APPROVED: { label: 'Đã được duyệt', tone: 'green', hint: 'Chúc mừng! Bạn đã trở thành Cộng tác viên.' },
  REJECTED: { label: 'Không được duyệt', tone: 'red', hint: 'Đơn chưa được chấp nhận. Bạn có thể bổ sung hồ sơ và nộp lại.' },
  WITHDRAWN: { label: 'Đã rút đơn', tone: 'neutral', hint: 'Bạn đã rút đơn này.' },
}

/**
 * Đơn đang ở bước nào của APPLICATION_STAGES và có bị dừng không (để tô ProcessSteps):
 *   - Bị từ chối ở bước Biên tập viên (chưa tới Phó TBT) -> bước 1 đỏ; ở bước Phó TBT -> bước 2 đỏ.
 *   - Rút đơn -> dừng ở bước 1.
 */
export const applicationProgress = (application) => {
  switch (application.status) {
    case 'PENDING_EDITOR':
      return { stage: 1, ended: false }
    case 'PENDING_DEPUTY':
      return { stage: 2, ended: false }
    case 'APPROVED':
      return { stage: 4, ended: false }
    case 'REJECTED':
      return { stage: application.deputyReviewedAt ? 2 : 1, ended: true }
    default:
      return { stage: 1, ended: true }
  }
}

/** Thời gian có thể nhận nhiệm vụ. */
export const AVAILABILITY_OPTIONS = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'WEEKENDS', label: 'Ngoài giờ / cuối tuần' },
]

export const AVAILABILITY_LABELS = Object.fromEntries(AVAILABILITY_OPTIONS.map((item) => [item.value, item.label]))
