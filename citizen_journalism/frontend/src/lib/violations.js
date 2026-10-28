export const VIOLATION_TYPES = {
  SPAM: 'Tin rác / lạm dụng',
  FALSE_INFORMATION: 'Thông tin sai sự thật',
  INACCURATE_EVIDENCE: 'Chứng cứ không chính xác',
  COPYRIGHT_VIOLATION: 'Vi phạm bản quyền',
  HARASSMENT: 'Quấy rối / công kích',
  POLICY_VIOLATION: 'Vi phạm quy định',
  OTHER: 'Khác',
}

export const VIOLATION_SEVERITIES = {
  LOW: { label: 'Thấp', tone: 'neutral' },
  MEDIUM: { label: 'Trung bình', tone: 'orange' },
  HIGH: { label: 'Cao', tone: 'red' },
  CRITICAL: { label: 'Nghiêm trọng', tone: 'dark' },
}

export const VIOLATION_STATUSES = {
  PENDING_REVIEW: { label: 'Chờ xem xét', tone: 'blue' },
  PENDING_APPROVAL: { label: 'Chờ phê duyệt', tone: 'purple' },
  RESOLVED: { label: 'Đã xử lý', tone: 'green' },
  DISMISSED: { label: 'Đã bỏ qua', tone: 'neutral' },
  REJECTED: { label: 'Không được duyệt', tone: 'red' },
}

export const VIOLATION_ACTIONS = {
  WARNING: 'Cảnh cáo tài khoản',
  DEDUCT_POINTS: 'Trừ điểm uy tín',
  LOCK_ACCOUNT: 'Khóa tài khoản',
  UNLOCK_ACCOUNT: 'Mở khóa tài khoản',
  RETRACT_CONTENT: 'Gỡ nội dung liên quan',
}

export const VIOLATION_TYPE_OPTIONS = Object.entries(VIOLATION_TYPES).map(([value, label]) => ({ value, label }))
export const VIOLATION_SEVERITY_OPTIONS = Object.entries(VIOLATION_SEVERITIES).map(([value, info]) => ({ value, label: info.label }))
export const VIOLATION_STATUS_OPTIONS = Object.entries(VIOLATION_STATUSES).map(([value, info]) => ({ value, label: info.label }))
