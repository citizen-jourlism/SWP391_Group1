import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import FieldReportCard from '../../components/contributor/FieldReportCard'
import AssignmentHistoryDialog from '../../components/editor/AssignmentHistoryDialog'
import { ReasonDialog } from '../../components/research/ResearchEditorial'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ASSIGNABLE_SUBMISSION_STATUSES,
  assignmentBadge,
  canReassign,
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
 *   - "Giao CTV xác minh" mở /editor/queue/<mã>/assign (EditorAssignContributor), chỉ hiện khi hồ sơ chưa từng được giao.
 *     Hồ sơ từng được giao thì có ô nhiệm vụ ngay dưới thanh này: nút "Thu hồi" khi nhiệm vụ còn hiệu lực,
 *     nút "Giao CTV khác" khi CTV từ chối / huỷ hoặc nhiệm vụ đã bị thu hồi.
 *   - "Lịch sử" mở AssignmentHistoryDialog: giao cho ai, ai nhận, ai từ chối, lý do...
 * Nhiệm vụ đã nộp báo cáo thì hiện báo cáo (FieldReportCard) ngay dưới ô nhiệm vụ. Báo cáo đang chờ xem thì có
 * 3 nút phản hồi: yêu cầu sửa bài, yêu cầu bổ sung tư liệu, duyệt.
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
  const { data: assignment, setData: setAssignment, loading: assignmentLoading, reload: reloadAssignment } = useAsyncData(
    () => editorService.getLatestAssignment(code),
    `assignment|${code}`,
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const canAssignFirst = !assignment && !assignmentLoading && ASSIGNABLE_SUBMISSION_STATUSES.includes(data?.status)

  return (
    <div className="desk-detail">
      <Link to="/editor/queue" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hàng đợi tin bài
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {/* Thu hồi xong thì thông báo "đã giao" không còn đúng nữa */}
      <Alert type="success">{ACTIVE_ASSIGNMENT_STATUSES.includes(assignment?.status) && state?.notice}</Alert>
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
              {canAssignFirst && (
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
              <Button variant="secondary" className="btn--sm" onClick={() => setHistoryOpen(true)}>
                <Icon name="clock" size={14} />
                Lịch sử
              </Button>
            </div>
          </section>
          {assignment && <CurrentAssignment assignment={assignment} onCancelled={setAssignment} />}
          {assignment?.status === 'COMPLETED' && <AssignmentReport assignmentId={assignment.id} onReviewed={reloadAssignment} />}
          <SubmissionDetail detail={data} />
        </>
      )}

      {historyOpen && <AssignmentHistoryDialog code={code} onClose={() => setHistoryOpen(false)} />}
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
      {canReassign(assignment) && (
        <Button to={`/editor/queue/${assignment.trackingCode}/assign`} className="btn--sm">
          <Icon name="mapPin" size={14} />
          Giao CTV khác
        </Button>
      )}
      {assignment.note && <p className="assign-current__note">{assignment.note}</p>}
      {assignment.cancelReason && <p className="assign-current__note">Lý do: {assignment.cancelReason}</p>}

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

/** Hộp thoại phản hồi đang mở: gửi yêu cầu sửa bài hoặc bổ sung tư liệu. */
const REQUEST_DIALOGS = {
  revision: {
    title: 'Yêu cầu sửa bài',
    message: 'Cộng tác viên sẽ nhận được email kèm nội dung cần sửa.',
    send: editorService.requestReportRevision,
  },
  evidence: {
    title: 'Yêu cầu bổ sung tư liệu',
    message: 'Cộng tác viên sẽ nhận được email kèm những tư liệu cần bổ sung.',
    send: editorService.requestReportEvidence,
  },
}

/** Báo cáo hiện trường đã nộp, kèm các nút phản hồi khi báo cáo đang chờ xem. */
function AssignmentReport({ assignmentId, onReviewed }) {
  const { data: report, error, setData } = useAsyncData(() => editorService.getAssignmentReport(assignmentId), assignmentId)
  const [dialog, setDialog] = useState(null) // 'revision' | 'evidence' | 'approve'
  const request = REQUEST_DIALOGS[dialog]

  /** API trả về báo cáo mới nhất -> cập nhật thẳng, rồi tải lại ô nhiệm vụ để đổi nhãn trạng thái. */
  const applyResult = (response) => {
    setData(response.data)
    onReviewed()
  }

  if (error && !report) return <Alert type="error">{error}</Alert>
  if (!report) return <div className="skeleton skeleton--card" />

  return (
    <>
      <FieldReportCard
        report={report}
        actions={
          report.reviewStatus === 'PENDING_REVIEW' && (
            <>
              <Button className="btn--sm" onClick={() => setDialog('approve')}>
                <Icon name="checkCircle" size={14} />
                Duyệt báo cáo
              </Button>
              <Button variant="secondary" className="btn--sm" onClick={() => setDialog('revision')}>
                <Icon name="edit" size={14} />
                Yêu cầu sửa bài
              </Button>
              <Button variant="secondary" className="btn--sm" onClick={() => setDialog('evidence')}>
                <Icon name="upload" size={14} />
                Yêu cầu bổ sung tư liệu
              </Button>
            </>
          )
        }
      />
      <ReasonDialog
        open={Boolean(request)}
        title={request?.title}
        message={request?.message}
        label="Nội dung yêu cầu"
        confirmLabel="Gửi yêu cầu"
        confirmVariant="primary"
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => applyResult(await request.send(assignmentId, reason))}
      />
      <ConfirmDialog
        open={dialog === 'approve'}
        title="Duyệt báo cáo"
        message="Sau khi duyệt, Cộng tác viên không sửa báo cáo được nữa."
        confirmLabel="Duyệt báo cáo"
        onConfirm={async () => applyResult(await editorService.approveReport(assignmentId))}
        onClose={() => setDialog(null)}
      />
    </>
  )
}

export default EditorSubmissionDetail
