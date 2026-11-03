/*
 * HẰNG SỐ của BÀN DUYỆT BAN BIÊN TẬP (Phó TBT / Tổng biên tập). Value khớp enum trong backend LeadershipService.java.
 */

/** Dấu hiệu Breaking — cùng tiêu chuẩn với bài nghiên cứu (lib/researchEditorial.js). Tick 1 dấu hiệu là đủ. */
export const BREAKING_SIGNS = [
  {
    value: 'NATIONAL_SENSITIVE',
    label: 'Nhạy cảm cấp quốc gia',
    hint: 'Chủ quyền, quốc phòng - an ninh, tôn giáo, dân tộc, đối ngoại, lãnh đạo cấp cao.',
  },
  {
    value: 'WIDE_PUBLIC_HARM',
    label: 'Nguy hại đang xảy ra, từ nhiều tỉnh trở lên',
    hint: 'Đe doạ tính mạng, sức khoẻ, tài sản của người dân ở nhiều tỉnh hoặc cả nước (ô nhiễm, dịch bệnh...).',
  },
  {
    value: 'NATIONAL_STATE_CRITICISM',
    label: 'Phê phán cơ quan nhà nước ở phạm vi toàn quốc',
    hint: 'Chỉ ra sai phạm của bộ, ngành, cán bộ cụ thể mà cả nước quan tâm.',
  },
]

/** Nhãn vai trò người ghi ý kiến (editorial_reviews.review_role). */
export const NOTE_ROLE = {
  EDITOR: { label: 'Biên tập viên', tone: 'blue' },
  DEPUTY_EIC: { label: 'Phó Tổng biên tập', tone: 'orange' },
  EIC: { label: 'Tổng biên tập', tone: 'red' },
}

/** Nhãn hành động (editorial_reviews.action). */
export const NOTE_ACTION = {
  APPROVE: { label: 'Duyệt', tone: 'green' },
  ESCALATE: { label: 'Chuyển Tổng biên tập', tone: 'purple' },
  REQUEST_EDIT: { label: 'Yêu cầu chỉnh sửa', tone: 'orange' },
  REQUEST_INFO: { label: 'Yêu cầu bổ sung', tone: 'orange' },
  REJECT: { label: 'Từ chối', tone: 'red' },
  RETRACT: { label: 'Gỡ bài', tone: 'red' },
}

/** 2 tab của Bàn duyệt. */
export const QUEUE_KINDS = [
  { value: 'SUBMISSION', label: 'Hồ sơ phản ánh' },
  { value: 'RESEARCH', label: 'Bài nghiên cứu' },
]
