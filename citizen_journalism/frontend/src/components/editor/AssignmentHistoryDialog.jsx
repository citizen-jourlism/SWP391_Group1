import Alert from '../ui/Alert'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import { useAsyncData } from '../../hooks/useAsyncData'
import { HISTORY_STEPS } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'
import '../../assets/styles/assignment.css'

/**
 * Hộp thoại LỊCH SỬ NHIỆM VỤ của 1 hồ sơ: lần lượt giao cho ai, ai nhận, ai từ chối, lý do...
 * Dùng ở: routes/editor/EditorAssignments.jsx (nút "Lịch sử" từng dòng), EditorSubmissionDetail.jsx.
 * Dữ liệu: GET /api/editor/assignments/history?code=... (chỉ Biên tập viên).
 *
 * Trang cha chỉ render hộp thoại khi cần mở, nên mỗi lần mở đều tải dữ liệu mới nhất.
 *
 * Props: code (mã hồ sơ), onClose.
 */
function AssignmentHistoryDialog({ code, onClose }) {
  const { data: entries, error } = useAsyncData(() => editorService.getAssignmentHistory(code), code)

  return (
    <Modal open title={`Lịch sử hồ sơ ${code}`} onClose={onClose}>
      <Alert type="error">{error}</Alert>
      {!entries && !error && <div className="skeleton skeleton--card" aria-busy="true" aria-label="Đang tải lịch sử" />}

      {entries && (
        <ol className="assign-history">
          {entries.map((entry, index) => {
            const step = HISTORY_STEPS[entry.type]
            return (
              <li key={index}>
                <span className={`assign-history__icon assign-history__icon--${step.tone}`}>
                  <Icon name={step.icon} size={15} />
                </span>
                <div>
                  <strong>{step.title(entry)}</strong>
                  <small>{formatDateTime(entry.at)}</small>
                  {entry.deadline && <p>Hạn hoàn thành: {formatDateTime(entry.deadline)}</p>}
                  {entry.detail && (
                    <p>
                      {step.detailLabel}: {entry.detail}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}

export default AssignmentHistoryDialog
