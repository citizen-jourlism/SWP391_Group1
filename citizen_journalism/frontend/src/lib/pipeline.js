/**
 * Dữ liệu hiển thị của bảng TIẾN ĐỘ TOÀ SOẠN (routes/editor/EditorPipeline.jsx).
 * Key khớp với backend: EditorPipeline.Stage. Backend đã trả các cột đúng thứ tự, ở đây chỉ giữ chữ, icon và màu.
 */
export const PIPELINE_STAGES = {
  RECEIVED: { label: 'Chờ tiếp nhận', hint: 'Hồ sơ mới, chưa có ai nhận', icon: 'fileText', tone: 'blue' },
  SCREENING: { label: 'Đang thẩm định', hint: 'Biên tập viên đang xem xét', icon: 'search', tone: 'blue' },
  NEED_INFO: { label: 'Chờ người gửi bổ sung', hint: 'Đã gửi yêu cầu bổ sung', icon: 'info', tone: 'orange' },
  FIELD_WORK: { label: 'CTV đang xác minh', hint: 'Nhiệm vụ đang chạy', icon: 'mapPin', tone: 'orange' },
  REPORT_REVIEW: { label: 'Xem báo cáo CTV', hint: 'CTV đã nộp báo cáo', icon: 'edit', tone: 'orange' },
  LEADERSHIP: { label: 'Chờ lãnh đạo duyệt', hint: 'Phó TBT hoặc TBT', icon: 'shield', tone: 'purple' },
  READY_TO_PUBLISH: { label: 'Sẵn sàng đăng', hint: 'Đã được duyệt', icon: 'checkCircle', tone: 'green' },
}

/** Các bước đang nằm ở tay Biên tập viên, để thẻ số liệu "Cần BTV xử lý" đếm đúng. */
export const EDITOR_STAGES = ['RECEIVED', 'SCREENING', 'REPORT_REVIEW']

/**
 * Thẻ có cần ghi rõ trạng thái hồ sơ không. Thường thì tên cột đã nói lên trạng thái, chỉ 2 trường hợp cần thêm:
 * cột lãnh đạo (chờ Phó TBT hay TBT) và hồ sơ bị Phó TBT trả về nằm chung cột thẩm định.
 */
export const showsStatus = (stage, status) => stage === 'LEADERSHIP' || status === 'DEPUTY_REJECTED'
