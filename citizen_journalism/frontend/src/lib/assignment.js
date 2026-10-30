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
  COMPLETED: { label: 'Đã nộp báo cáo', tone: 'green' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/** Nhiệm vụ đã huỷ: phân biệt ai huỷ theo FieldAssignment.CancelType ở backend. */
const CANCEL_BADGES = {
  DECLINED: { label: 'Đã từ chối', tone: 'red' },
  CONTRIBUTOR_CANCELLED: { label: 'CTV đã huỷ', tone: 'red' },
  EDITOR_CANCELLED: { label: 'Toà soạn thu hồi', tone: 'neutral' },
}

/** Nhiệm vụ đã nộp báo cáo: nhãn theo kết quả xem xét (khớp FieldReportFeedback.ReviewStatus ở backend). */
const REVIEW_BADGES = {
  PENDING_REVIEW: { label: 'Chờ BTV xem', tone: 'blue' },
  REVISION_REQUESTED: { label: 'Cần sửa bài', tone: 'orange' },
  EVIDENCE_REQUESTED: { label: 'Cần bổ sung tư liệu', tone: 'orange' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
}

/**
 * Chữ + màu nhãn của 1 nhiệm vụ, dùng chung cho bàn Biên tập viên và trang của Cộng tác viên.
 * reviewStatus có ở các danh sách, report.reviewStatus có ở trang chi tiết của CTV.
 */
export const assignmentBadge = (assignment) =>
  REVIEW_BADGES[assignment.reviewStatus ?? assignment.report?.reviewStatus] ??
  CANCEL_BADGES[assignment.cancelType] ??
  ASSIGNMENT_STATUS[assignment.status] ?? { label: assignment.status, tone: 'neutral' }

/** Các loại phản hồi của Biên tập viên (khớp FieldReportFeedback.Type ở backend). */
export const FEEDBACK_TYPES = {
  REQUEST_REVISION: { label: 'Yêu cầu sửa bài', icon: 'edit', tone: 'orange' },
  REQUEST_EVIDENCE: { label: 'Yêu cầu bổ sung tư liệu', icon: 'upload', tone: 'orange' },
  APPROVED: { label: 'Đã duyệt báo cáo', icon: 'checkCircle', tone: 'green' },
}

/** Yêu cầu đang chờ Cộng tác viên xử lý; không có thì trả về undefined. */
export const openFeedback = (report) => report?.feedbacks.find((item) => item.type !== 'APPROVED' && !item.resolvedAt)

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
  REVISION_REQUESTED: {
    icon: 'edit',
    tone: 'orange',
    title: (entry) => `${entry.actorName} yêu cầu ${entry.contributorName} sửa bài`,
    detailLabel: 'Yêu cầu',
  },
  EVIDENCE_REQUESTED: {
    icon: 'upload',
    tone: 'orange',
    title: (entry) => `${entry.actorName} yêu cầu ${entry.contributorName} bổ sung tư liệu`,
    detailLabel: 'Yêu cầu',
  },
  REVISION_SUBMITTED: { icon: 'edit', tone: 'blue', title: (entry) => `${entry.contributorName} gửi lại bài viết`, detailLabel: 'Lời nhắn' },
  EVIDENCE_SUBMITTED: { icon: 'upload', tone: 'blue', title: (entry) => `${entry.contributorName} bổ sung tư liệu`, detailLabel: 'Lời nhắn' },
  REPORT_APPROVED: { icon: 'checkCircle', tone: 'green', title: (entry) => `${entry.actorName} duyệt báo cáo` },
}

/** Kết luận xác minh trong báo cáo hiện trường (khớp FieldReport.Conclusion ở backend). */
export const REPORT_CONCLUSIONS = [
  { value: 'VERIFIED_TRUE', label: 'Đúng sự thật', description: 'Thông tin được xác minh đầy đủ.', tone: 'green' },
  { value: 'PARTIALLY_TRUE', label: 'Đúng một phần', description: 'Có căn cứ nhưng chưa đúng hoàn toàn.', tone: 'orange' },
  { value: 'UNFOUNDED', label: 'Không có căn cứ', description: 'Không xác minh được hoặc thông tin sai.', tone: 'red' },
]

/** Đề xuất của CTV trong báo cáo hiện trường (khớp FieldReport.Recommendation ở backend). */
export const REPORT_RECOMMENDATIONS = [
  { value: 'PUBLISH', label: 'Đăng bài', description: 'Đủ căn cứ để biên tập và đăng.', tone: 'green' },
  { value: 'FURTHER_CHECK', label: 'Điều tra thêm', description: 'Cần xác minh thêm trước khi đăng.', tone: 'orange' },
  { value: 'DROP_CASE', label: 'Dừng xử lý', description: 'Không nên tiếp tục theo vụ việc.', tone: 'neutral' },
]

export const REPORT_CONCLUSION_BY_VALUE = Object.fromEntries(REPORT_CONCLUSIONS.map((item) => [item.value, item]))
export const REPORT_RECOMMENDATION_BY_VALUE = Object.fromEntries(REPORT_RECOMMENDATIONS.map((item) => [item.value, item]))

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
