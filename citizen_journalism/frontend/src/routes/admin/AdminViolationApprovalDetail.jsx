import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { VIOLATION_ACTIONS, VIOLATION_SEVERITIES, VIOLATION_STATUSES, VIOLATION_TYPES } from '../../lib/violations'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { violationService } from '../../services/violationService'

function AdminViolationApprovalDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => violationService.getApproval(id), id)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')

  const askDecision = (decision) => {
    if (decision === 'REJECT' && note.trim().length < 10) {
      setFormError('Vui lòng ghi lý do từ chối, ít nhất 10 ký tự.')
      return
    }
    if (note.trim().length > 2000) {
      setFormError('Ghi chú tối đa 2000 ký tự.')
      return
    }
    setFormError('')
    setConfirm(decision)
  }

  const decide = async () => {
    const response = await violationService.decide(id, { decision: confirm, note: note.trim() || null })
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  if (error && !data) {
    return <div className="desk-detail"><Link to="/leadership" className="desk-back"><Icon name="arrowLeft" size={16} />Hàng chờ duyệt</Link><Alert type="error">{error}</Alert></div>
  }
  if (!data) return <div className="skeleton skeleton--page" />

  const pending = data.status === 'PENDING_APPROVAL'
  const status = VIOLATION_STATUSES[data.status]
  const severity = VIOLATION_SEVERITIES[data.severity]
  const accountStatus = STATUS_INFO[data.account.status]
  const action = VIOLATION_ACTIONS[data.proposedAction] ?? data.proposedAction

  return (
    <div className="desk-detail">
      <Link to="/leadership" className="desk-back"><Icon name="arrowLeft" size={16} />Hàng chờ duyệt</Link>
      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>

      <div className="review-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header"><h2>Tài khoản</h2><Badge tone={accountStatus?.tone}>{accountStatus?.label ?? data.account.status}</Badge></div>
          <div className="applicant__head"><strong>{data.account.fullName}</strong><span className="applicant__id">{data.account.id} · {ROLE_LABELS[data.account.role] ?? data.account.role}</span></div>
          <dl className="applicant__facts">
            <div><dt>Email</dt><dd>{data.account.email}</dd></div>
            <div><dt>Điểm uy tín</dt><dd>{data.account.reputationScore ?? 0}</dd></div>
            <div><dt>Người lập báo cáo</dt><dd>{data.reporter?.fullName ?? '—'} ({data.reporter?.id ?? '—'})</dd></div>
            <div><dt>Biên tập viên xem xét</dt><dd>{data.reviewer?.fullName ?? '—'} ({data.reviewer?.id ?? '—'})</dd></div>
          </dl>
        </aside>

        <div className="admin-stack">
          <section className="admin-panel">
            <div className="admin-panel__header"><h2>Báo cáo #{data.id}</h2><Badge tone={status?.tone}>{status?.label ?? data.status}</Badge></div>
            <dl className="applicant__facts">
              <div><dt>Loại vi phạm</dt><dd>{VIOLATION_TYPES[data.type] ?? data.type}</dd></div>
              <div><dt>Mức độ</dt><dd><Badge tone={severity?.tone}>{severity?.label ?? data.severity}</Badge></dd></div>
              <div><dt>Biện pháp cần duyệt</dt><dd><strong>{action ?? '—'}</strong></dd></div>
              <div><dt>Hồ sơ liên quan</dt><dd>{data.submission ? `${data.submission.trackingCode} · ${data.submission.title} (${data.submission.status})` : 'Không có'}</dd></div>
              <div><dt>Gửi duyệt lúc</dt><dd>{formatDateTime(data.reviewedAt)}</dd></div>
            </dl>
            <div><strong>Mô tả báo cáo</strong><p>{data.description}</p></div>
            {data.evidenceNote && <div><strong>Ghi chú chứng cứ</strong><p>{data.evidenceNote}</p></div>}
            {data.proposedAction === 'RETRACT_CONTENT' && (
              <div>
                <strong>Ảnh chụp nội dung tại thời điểm trình gỡ bài</strong>
                <pre className="content-snapshot">{data.retractionSnapshot || 'Không có bản chụp nội dung.'}</pre>
              </div>
            )}
            {data.reviewNote && <Alert type="info" title="Nhận xét của biên tập viên">{data.reviewNote}</Alert>}
            {data.approvalNote && <Alert type="info" title="Ghi chú phê duyệt">{data.approvalNote}</Alert>}
          </section>

          {pending && (
            <section className="admin-panel review-box">
              <div className="admin-panel__header"><h2>Quyết định phê duyệt</h2><span>Kiểm tra kỹ tài khoản và nội dung trước khi áp dụng</span></div>
              {data.proposedAction === 'UNLOCK_ACCOUNT' && <Alert type="info">Chấp thuận sẽ mở khóa tài khoản và xóa bộ đếm đăng nhập sai.</Alert>}
              {data.proposedAction === 'RETRACT_CONTENT' && <Alert type="info">Chấp thuận sẽ chuyển hồ sơ liên quan sang trạng thái đã gỡ và ghi lại sự kiện xử lý.</Alert>}
              {data.proposedAction === 'LOCK_ACCOUNT' && <Alert type="info">Chấp thuận sẽ khóa tài khoản và chặn đăng nhập.</Alert>}
              <TextField
                label="Ghi chú phê duyệt"
                multiline
                rows={3}
                counter={2000}
                hint={data.proposedAction === 'RETRACT_CONTENT' ? 'Ghi chú này được lưu cùng sự kiện gỡ nội dung.' : 'Bắt buộc khi từ chối, tối thiểu 10 ký tự.'}
                value={note}
                onChange={(event) => { setNote(event.target.value); setFormError('') }}
                error={formError}
              />
              <div className="review-box__actions">
                <Button variant="danger" onClick={() => askDecision('REJECT')}><Icon name="x" size={16} />Từ chối</Button>
                <Button onClick={() => askDecision('APPROVE')}><Icon name="check" size={16} />Phê duyệt và áp dụng</Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'REJECT' ? 'Từ chối đề xuất' : 'Phê duyệt đề xuất'}
        message={confirm === 'REJECT' ? 'Đề xuất sẽ bị từ chối và không thay đổi trạng thái tài khoản/nội dung.' : `Áp dụng “${action}” cho ${data.account.fullName}?`}
        confirmLabel={confirm === 'REJECT' ? 'Từ chối' : 'Phê duyệt'}
        danger={confirm === 'REJECT'}
        onConfirm={decide}
        onClose={() => setConfirm('')}
      />
    </div>
  )
}

export default AdminViolationApprovalDetail