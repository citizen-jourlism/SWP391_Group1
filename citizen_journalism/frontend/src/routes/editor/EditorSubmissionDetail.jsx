import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ReasonDialog } from '../../components/research/ResearchEditorial'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ASSIGNABLE_SUBMISSION_STATUSES,
  assignmentBadge,
  isOverdue,
} from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'
import '../../assets/styles/assignment.css'

/*
 * CHI TIẾT 1 HỒ SƠ TRONG HÀNG ĐỢI — /editor/queue/:code (Biên tập viên).
 * Dữ liệu: GET /api/editor/submissions/{mã}; hiển thị bằng SubmissionDetail (dùng chung với trang người dân theo dõi).
 *
 * Thanh thao tác phía trên:
 *   - "Kiểm tra tin trùng" mở /editor/screening/<mã> (EditorDuplicateCheck).
 *   - "Giao CTV xác minh" mở /editor/queue/<mã>/assign (EditorAssignContributor); ẩn khi hồ sơ đã xử lý xong
 *     hoặc đang có nhiệm vụ. Hồ sơ từng được giao thì có thêm ô nhiệm vụ ngay dưới thanh này,
 *     kèm nút "Thu hồi" khi nhiệm vụ còn hiệu lực. CTV từ chối / huỷ hoặc thu hồi xong thì giao lại được.
 *   - Các nút còn lại (tiếp nhận thẩm định, yêu cầu bổ sung, từ chối) đã ĐẶT SẴN nhưng đang KHOÁ:
 *     backend xử lý tin sẽ làm ở bản sau.
 */

const PLANNED_ACTIONS = [
  { icon: 'checkCircle', label: 'Tiếp nhận thẩm định' },
  { icon: 'info', label: 'Yêu cầu bổ sung' },
  { icon: 'x', label: 'Từ chối', danger: true },
]

function EditorSubmissionDetail() {
  const { code } = useParams()
  const { state } = useLocation() // state.notice: thông báo từ trang chọn CTV sau khi giao xong
  const { data, error } = useAsyncData(() => editorService.getSubmission(code), code)
  const { data: assignment, setData: setAssignment } = useAsyncData(() => editorService.getLatestAssignment(code), `assignment|${code}`)
  const canAssign =
    ASSIGNABLE_SUBMISSION_STATUSES.includes(data?.status) && !ACTIVE_ASSIGNMENT_STATUSES.includes(assignment?.status)

  return (
    <div className="desk-detail">
      <Link to="/editor/queue" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hàng đợi tin bài
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {/* Thu hồi xong thì thông báo "đã giao" không còn đúng nữa */}
      <Alert type="success">{!canAssign && state?.notice}</Alert>
      {!data && !error && <div className="skeleton skeleton--page" />}

      {data && (
        <>
          <section className="admin-panel desk-actions">
            <div>
              <strong>Xử lý hồ sơ</strong>
              <small>Kiểm tra tin trùng trước khi tiếp nhận. Các thao tác khác sẽ có ở bản sau.</small>
            </div>
            <div className="desk-actions__buttons">
              <Button to={`/editor/screening/${code}`} className="btn--sm">
                <Icon name="copy" size={14} />
                Kiểm tra tin trùng
              </Button>
              {canAssign && (
                <Button to={`/editor/queue/${code}/assign`} variant="secondary" className="btn--sm">
                  <Icon name="mapPin" size={14} />
                  Giao CTV xác minh
                </Button>
              )}
              {PLANNED_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant={action.danger ? 'danger' : 'secondary'}
                  className="btn--sm"
                  disabled
                  title="Sắp có"
                >
                  <Icon name={action.icon} size={14} />
                  {action.label}
                </Button>
              ))}
            </div>
          </section>
          {assignment && <CurrentAssignment assignment={assignment} onCancelled={setAssignment} />}
          <SubmissionDetail detail={data} />
        </>
      )}
    </div>
  )
}

/** Ô nhiệm vụ mới nhất của hồ sơ: ai đang xác minh, hạn khi nào, chỉ dẫn đã gửi. */
function CurrentAssignment({ assignment, onCancelled }) {
  const [revoking, setRevoking] = useState(false)
  const badge = assignmentBadge(assignment)

  const revoke = async (reason) => {
    const response = await editorService.cancelAssignment(assignment.id, reason)
    onCancelled(response.data)
  }

  return (
    <section className="admin-panel assign-current">
      <Avatar name={assignment.contributorName} src={assignment.contributorAvatarUrl} size={44} />
      <div className="assign-current__info">
        <strong>{assignment.contributorName}</strong>
        <small>Hạn hoàn thành: {formatDateTime(assignment.deadline)}</small>
        {isOverdue(assignment) && <small className="assign-overdue">Quá hạn</small>}
      </div>
      <Badge tone={badge.tone}>{badge.label}</Badge>
      {ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status) && (
        <Button variant="secondary" className="btn--sm" onClick={() => setRevoking(true)}>
          Thu hồi
        </Button>
      )}
      {assignment.note && <p className="assign-current__note">{assignment.note}</p>}
      {assignment.cancelReason && <p className="assign-current__note">Lý do huỷ: {assignment.cancelReason}</p>}

      <ReasonDialog
        open={revoking}
        title="Thu hồi nhiệm vụ"
        message={`${assignment.contributorName} sẽ nhận được email kèm lý do. Sau đó bạn có thể giao cho Cộng tác viên khác.`}
        label="Lý do thu hồi"
        confirmLabel="Thu hồi"
        onClose={() => setRevoking(false)}
        onSubmit={revoke}
      />
    </section>
  )
}

export default EditorSubmissionDetail
