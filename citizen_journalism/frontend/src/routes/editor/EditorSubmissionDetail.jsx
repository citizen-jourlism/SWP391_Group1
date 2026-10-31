import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import FieldReportCard from '../../components/contributor/FieldReportCard'
import ApproveSubmissionDialog from '../../components/editor/ApproveSubmissionDialog'
import AssignmentHistoryDialog from '../../components/editor/AssignmentHistoryDialog'
import { ReasonDialog } from '../../components/research/ResearchEditorial'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ASSIGNABLE_SUBMISSION_STATUSES,
  assignmentBadge,
  canReassign,
  isOverdue,
} from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { REJECTABLE_STATUSES } from '../../lib/rejection'
import { REQUESTABLE_STATUSES } from '../../lib/requestInfo'
import { editorService } from '../../services/editorService'
import { reviewStartService } from '../../services/reviewStartService'
import '../../assets/styles/assignment.css'

function EditorSubmissionDetail({ reputationMode = false }) {
  const { code, accountId } = useParams()
  const { state } = useLocation()
  const { data: editorData, error, setData } = useAsyncData(() => editorService.getSubmission(code), code)
  const data = editorData?.detail ?? editorData
  const reputationReviewed = editorData?.reputationReviewed
  const { data: assignment, setData: setAssignment, loading: assignmentLoading, reload: reloadAssignment } = useAsyncData(
    () => editorService.getLatestAssignment(code),
    `assignment|${code}`,
  )
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const canAssignFirst = !assignment && !assignmentLoading && ASSIGNABLE_SUBMISSION_STATUSES.includes(data?.status)
  const assignmentRunning = ACTIVE_ASSIGNMENT_STATUSES.includes(assignment?.status)
  const canApprove =
    data?.category === 'HOT_NEWS' && data.status === 'IN_REVIEW' && !assignmentRunning && assignment?.status !== 'COMPLETED'

  const submitReview = (value) => {
    if (value === 'FAKE_NEWS' && reason.trim().length < 10) {
      setFormError('Vui lòng ghi lý do tin giả, ít nhất 10 ký tự.')
      return
    }
    setFormError('')
    setDecision(value)
  }

  const confirmReview = async () => {
    const response = await editorService.reviewReputationSubmission(code, {
      decision,
      reason: decision === 'FAKE_NEWS' ? reason.trim() : null,
    })
    setData({ ...editorData, detail: response.data.article, reputationReviewed: true })
    setNotice(`${response.message} Điểm uy tín hiện tại: ${response.data.reputationScore}.`)
    setReason('')
  }

  const handleApproved = (response) => {
    setData(response.data.submission)
    setNotice(response.message)
    setApproveOpen(false)
  }

  // ConfirmDialog tự hiện lỗi (409 khi BTV khác đã nhận trước...) và tự đóng khi thành công
  const startReview = async () => {
    const response = await reviewStartService.startReview(code)
    setData(response.data)
    setNotice(response.message)
  }

  return (
    <div className="desk-detail">
      <Link to={reputationMode ? `/editor/reputation/accounts/${accountId}` : '/editor/queue'} className="desk-back">
        <Icon name="arrowLeft" size={16} />
        {reputationMode ? 'Danh sách bài và uy tín' : 'Hàng đợi tin bài'}
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {/* Thu hồi xong thì thông báo "đã giao" không còn đúng nữa */}
      <Alert type="success">{notice || (assignmentRunning && state?.notice)}</Alert>
      {!data && !error && <div className="skeleton skeleton--page" />}

      {data && (
        <>
          {reputationMode && !reputationReviewed && (
            <section className="admin-panel desk-actions">
              <div>
                <strong>Đánh giá uy tín bài viết</strong>
                <small>Bài hợp lệ: +5 điểm. Tin giả: gỡ bài và -10 điểm.</small>
              </div>
              <TextField
                label="Lý do từ chối tin giả"
                multiline
                rows={3}
                counter={2000}
                value={reason}
                onChange={(event) => { setReason(event.target.value); setFormError('') }}
                hint="Bắt buộc, tối thiểu 10 ký tự khi chọn tin giả."
                error={formError}
              />
              <div className="desk-actions__buttons">
                <Button variant="danger" className="btn--sm" onClick={() => submitReview('FAKE_NEWS')}>
                  <Icon name="x" size={14} />
                  Từ chối tin giả, gỡ bài và trừ 10 điểm
                </Button>
                <Button className="btn--sm" onClick={() => submitReview('APPROVE')}>
                  <Icon name="checkCircle" size={14} />
                  Xác nhận tin chuẩn, cộng 5 điểm
                </Button>
              </div>
            </section>
          )}
          {reputationMode && reputationReviewed && (
            <Alert type="info">Bài viết này đã được tính điểm uy tín và không thể xử lý lần nữa.</Alert>
          )}
          {!reputationMode && (
            <>
              <section className="admin-panel desk-actions">
                <div>
                  <strong>Xử lý hồ sơ</strong>
                  <small>
                    Tiếp nhận hồ sơ mới, giao CTV xác minh khi cần, yêu cầu bổ sung nếu còn thiếu thông tin, duyệt để
                    chuyển Phó Tổng biên tập hoặc từ chối nếu không đạt yêu cầu.
                  </small>
                </div>
                <div className="desk-actions__buttons">
                  {data.status === 'PENDING' && (
                    <Button variant="secondary" className="btn--sm" onClick={() => setStartOpen(true)}>
                      <Icon name="checkCircle" size={14} />
                      Tiếp nhận thẩm định
                    </Button>
                  )}
                  <Button to={`/editor/screening/${code}`} variant="secondary" className="btn--sm">
                    <Icon name="copy" size={14} />
                    Kiểm tra tin trùng
                  </Button>
                  {canAssignFirst && (
                    <Button to={`/editor/queue/${code}/assign`} variant="secondary" className="btn--sm">
                      <Icon name="mapPin" size={14} />
                      Giao CTV xác minh
                    </Button>
                  )}
                  {(REQUESTABLE_STATUSES.includes(data.status) || data.status === 'NEED_MORE_INFO') && (
                    <Button to={`/editor/queue/${code}/request-info`} variant="secondary" className="btn--sm">
                      <Icon name="info" size={14} />
                      {data.status === 'NEED_MORE_INFO' ? 'Xem yêu cầu bổ sung' : 'Yêu cầu bổ sung'}
                    </Button>
                  )}
                  {data.status === 'IN_REVIEW' && assignment?.status === 'COMPLETED' && (
                    <Button to={`/editor/queue/${code}/verification`} variant="secondary" className="btn--sm">
                      <Icon name="mapPin" size={14} />
                      Duyệt kết quả xác minh
                    </Button>
                  )}
                  {canApprove && (
                    <Button className="btn--sm" onClick={() => setApproveOpen(true)}>
                      <Icon name="send" size={14} />
                      Duyệt & chuyển Phó TBT
                    </Button>
                  )}
                  {REJECTABLE_STATUSES.includes(data.status) && (
                    <Button to={`/editor/queue/${code}/reject`} variant="danger" className="btn--sm">
                      <Icon name="x" size={14} />
                      Từ chối
                    </Button>
                  )}
                  <Button variant="secondary" className="btn--sm" onClick={() => setHistoryOpen(true)}>
                    <Icon name="clock" size={14} />
                    Lịch sử
                  </Button>
                </div>
              </section>
              {assignment && <CurrentAssignment assignment={assignment} onCancelled={setAssignment} />}
              {assignment?.status === 'COMPLETED' && (
                <AssignmentReport assignmentId={assignment.id} onReviewed={reloadAssignment} />
              )}
            </>
          )}
          <SubmissionDetail detail={data} />
          {!reputationMode && (
            <>
              <ConfirmDialog
                open={startOpen}
                title="Tiếp nhận thẩm định"
                message={`Bạn sẽ là Biên tập viên phụ trách hồ sơ ${data.trackingCode}. Hồ sơ chuyển sang trạng thái "Đang thẩm định" và người gửi thấy bước này trong nhật ký xử lý.`}
                confirmLabel="Tiếp nhận"
                onConfirm={startReview}
                onClose={() => setStartOpen(false)}
              />
              {approveOpen && (
                <ApproveSubmissionDialog code={code} onClose={() => setApproveOpen(false)} onApproved={handleApproved} />
              )}
            </>
          )}
        </>
      )}
      <ConfirmDialog
        open={Boolean(decision)}
        title={decision === 'FAKE_NEWS' ? 'Từ chối tin giả' : 'Duyệt tin chuẩn'}
        message={decision === 'FAKE_NEWS'
          ? 'Bài viết sẽ bị gỡ và tác giả bị trừ 10 điểm. Tài khoản sẽ khóa nếu điểm xuống dưới 80.'
          : 'Bài viết sẽ được chấp thuận và tác giả được cộng tối đa 5 điểm, không vượt quá 100.'}
        confirmLabel={decision === 'FAKE_NEWS' ? 'Từ chối và gỡ bài' : 'Duyệt tin'}
        danger={decision === 'FAKE_NEWS'}
        onConfirm={confirmReview}
        onClose={() => setDecision('')}
      />
      {!reputationMode && historyOpen && <AssignmentHistoryDialog code={code} onClose={() => setHistoryOpen(false)} />}
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
