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
import { STATUS_INFO } from '../../lib/roles'
import { violationService } from '../../services/violationService'

function EditorAppealDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => violationService.getEditorAppeal(id), id)
  const [decision, setDecision] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState(false)

  const submit = (value) => {
    if (value === 'REJECT' && note.trim().length < 10) {
      setFormError('Vui lòng ghi lý do từ chối, ít nhất 10 ký tự.')
      return
    }
    setDecision(value)
    setConfirm(true)
  }
  const confirmReview = async () => {
    const response = await violationService.reviewAppeal(id, { decision, note: note.trim() || null })
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  if (error && !data) return <div className="desk-detail"><Link to="/editor/appeals" className="desk-back"><Icon name="arrowLeft" size={16} />Khiếu nại mở khóa</Link><Alert type="error">{error}</Alert></div>
  if (!data) return <div className="skeleton skeleton--page" />

  const pending = data.status === 'PENDING_EDITOR'
  const accountStatus = STATUS_INFO[data.account.status]
  return (
    <div className="desk-detail">
      <Link to="/editor/appeals" className="desk-back"><Icon name="arrowLeft" size={16} />Khiếu nại mở khóa</Link>
      <Alert type="success">{notice}</Alert><Alert type="error">{error}</Alert>
      <div className="review-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header"><h2>Tài khoản</h2><Badge tone={accountStatus?.tone}>{accountStatus?.label ?? data.account.status}</Badge></div>
          <div className="applicant__head"><strong>{data.account.fullName}</strong><span className="applicant__id">{data.account.id}</span></div>
          <dl className="applicant__facts"><div><dt>Email</dt><dd>{data.account.email}</dd></div><div><dt>Điểm uy tín</dt><dd>{data.account.reputationScore ?? 0}</dd></div><div><dt>Ngày gửi</dt><dd>{formatDateTime(data.createdAt)}</dd></div></dl>
        </aside>
        <div className="admin-stack">
          <section className="admin-panel">
            <div className="admin-panel__header"><h2>Khiếu nại #{data.id}</h2><Badge tone={pending ? 'orange' : data.status === 'APPROVED' ? 'green' : data.status === 'REJECTED' ? 'red' : 'purple'}>{data.status}</Badge></div>
            <div><strong>Giải trình của người dùng</strong><p>{data.reason}</p></div>
            {data.evidenceNote && <div><strong>Bằng chứng / ghi chú</strong><p>{data.evidenceNote}</p></div>}
            {data.reviewNote && <Alert type="info" title="Nhận xét sơ duyệt">{data.reviewNote}</Alert>}
            {data.decisionNote && <Alert type="info" title="Ghi chú phê duyệt cuối">{data.decisionNote}</Alert>}
            <div className="data-table__note">Gửi lúc {formatDateTime(data.createdAt)} · Sơ duyệt lúc {formatDateTime(data.reviewedAt)} · Quyết định cuối {formatDateTime(data.decidedAt)}</div>
          </section>
          {pending && (
            <section className="admin-panel review-box">
              <div className="admin-panel__header"><h2>Sơ duyệt khiếu nại</h2><span>Biên tập viên xem xét, lãnh đạo quyết định cuối</span></div>
              <TextField label="Ghi chú sơ duyệt" multiline rows={3} counter={2000} value={note} onChange={(event) => { setNote(event.target.value); setFormError('') }} hint="Bắt buộc nếu từ chối, tối thiểu 10 ký tự." error={formError} />
              <div className="review-box__actions">
                <Button variant="danger" onClick={() => submit('REJECT')}><Icon name="x" size={16} />Từ chối</Button>
                <Button onClick={() => submit('FORWARD')}><Icon name="check" size={16} />Trình lãnh đạo phê duyệt</Button>
              </div>
            </section>
          )}
        </div>
      </div>
      <ConfirmDialog open={confirm} title={decision === 'REJECT' ? 'Từ chối khiếu nại' : 'Trình Phó Tổng biên tập'} message={decision === 'REJECT' ? 'Khiếu nại sẽ bị đóng, tài khoản vẫn bị khóa.' : 'Chuyển hồ sơ cùng nhận xét của bạn đến Phó Tổng biên tập?'} confirmLabel={decision === 'REJECT' ? 'Từ chối' : 'Chuyển cấp trên'} danger={decision === 'REJECT'} onConfirm={confirmReview} onClose={() => setConfirm(false)} />
    </div>
  )
}

export default EditorAppealDetail
