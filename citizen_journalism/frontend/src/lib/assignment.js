/**
 * Dữ liệu hiển thị dùng chung cho chức năng GIAO NHIỆM VỤ XÁC MINH HIỆN TRƯỜNG
 * (routes/editor/EditorAssignContributor.jsx, EditorAssignments.jsx, EditorSubmissionDetail.jsx,
 * routes/contributor/ContributorTasks.jsx, ContributorTaskDetail.jsx).
 * Giá trị (key, value) khớp với backend: FieldAssignment.AssignmentStatus, FieldAssignmentService.CandidateSort.
 */

/** Trạng thái nhiệm vụ: chữ + màu nhãn (Badge). */
export const ASSIGNMENT_STATUS = {
  ASSIGNED: { label: 'Chờ phản hồi', tone: 'orange' },
  ACCEPTED: { label: 'Đang xác minh', tone: 'blue' },
  COMPLETED: { label: 'Hoàn thành', tone: 'green' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/** Nhiệm vụ đã huỷ: phân biệt ai huỷ theo FieldAssignment.CancelType ở backend. */
const CANCEL_BADGES = {
  DECLINED: { label: 'Đã từ chối', tone: 'red' },
  CONTRIBUTOR_CANCELLED: { label: 'CTV đã huỷ', tone: 'red' },
  EDITOR_CANCELLED: { label: 'Toà soạn thu hồi', tone: 'neutral' },
}

/** Chữ + màu nhãn của 1 nhiệm vụ, dùng chung cho bàn Biên tập viên và trang của Cộng tác viên. */
export const assignmentBadge = (assignment) =>
  CANCEL_BADGES[assignment.cancelType] ?? ASSIGNMENT_STATUS[assignment.status] ?? { label: assignment.status, tone: 'neutral' }

/** Nhiệm vụ còn hiệu lực: mỗi hồ sơ chỉ có 1 nhiệm vụ như vậy tại một thời điểm. */
export const ACTIVE_ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACCEPTED']

/** Trạng thái hồ sơ cho phép giao nhiệm vụ. */
export const ASSIGNABLE_SUBMISSION_STATUSES = ['PENDING', 'IN_REVIEW']

/** Nhiệm vụ đã huỷ (từ chối, CTV huỷ, thu hồi) trong khi hồ sơ còn đang xử lý: giao được cho Cộng tác viên khác. */
export const canReassign = (assignment) =>
  assignment.status === 'CANCELLED' && ASSIGNABLE_SUBMISSION_STATUSES.includes(assignment.submissionStatus)

/** Các bước trong lịch sử nhiệm vụ (khớp AssignmentHistoryEntry.Type ở backend): icon, màu, câu mô tả, nhãn của phần chi tiết. */
export const HISTORY_STEPS = {
  SUBMITTED: { icon: 'fileText', tone: 'neutral', title: () => 'Hồ sơ được gửi tới toà soạn' },
  ASSIGNED: {
    icon: 'mapPin',
    tone: 'orange',
    title: (entry) => `${entry.actorName} giao nhiệm vụ cho ${entry.contributorName}`,
    detailLabel: 'Chỉ dẫn',
  },
  ACCEPTED: { icon: 'checkCircle', tone: 'blue', title: (entry) => `${entry.contributorName} nhận nhiệm vụ` },
  DECLINED: { icon: 'x', tone: 'red', title: (entry) => `${entry.contributorName} từ chối nhiệm vụ`, detailLabel: 'Lý do' },
  CONTRIBUTOR_CANCELLED: { icon: 'x', tone: 'red', title: (entry) => `${entry.contributorName} huỷ nhiệm vụ`, detailLabel: 'Lý do' },
  EDITOR_CANCELLED: {
    icon: 'x',
    tone: 'neutral',
    title: (entry) => `${entry.actorName} thu hồi nhiệm vụ của ${entry.contributorName}`,
    detailLabel: 'Lý do',
  },
  COMPLETED: { icon: 'check', tone: 'green', title: (entry) => `${entry.contributorName} nộp báo cáo hiện trường` },
}

/** Lọc theo điểm hiệu suất tối thiểu. */
export const SCORE_FILTERS = [
  { value: '50', label: 'Từ 50 điểm' },
  { value: '70', label: 'Từ 70 điểm' },
  { value: '90', label: 'Từ 90 điểm' },
]

/** Các cách sắp xếp danh sách Cộng tác viên. */
export const SORT_OPTIONS = [
  { value: 'RECOMMENDED', label: 'Phù hợp nhất' },
  { value: 'SCORE_DESC', label: 'Điểm cao đến thấp' },
  { value: 'SCORE_ASC', label: 'Điểm thấp đến cao' },
  { value: 'WORKLOAD', label: 'Ít việc nhất' },
]

/** Hạn hoàn thành gợi ý: sau 2 ngày, làm tròn về đầu giờ. */
const DEFAULT_DEADLINE_DAYS = 2

/** Giá trị mặc định cho ô datetime-local, dạng "YYYY-MM-DDTHH:mm" theo giờ máy người dùng. */
export const defaultDeadline = () => {
  const date = new Date(Date.now() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
  date.setMinutes(0, 0, 0)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16)
}

/** Nhiệm vụ chưa xong mà đã qua hạn. */
export const isOverdue = (assignment) =>
  ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status) && new Date(assignment.deadline) < new Date()
