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
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { violationService } from '../../services/violationService'

function LeadershipAppealDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => violationService.getLeadershipAppeal(id), id)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')

  const askDecision = (decision) => {
    if (decision === 'REJECT' && note.trim().length < 10) {
      setFormError('Vui lòng ghi lý do từ chối, ít nhất 10 ký tự.')
      return
    }
    setConfirm(decision)
  }
  const decide = async () => {
    const response = await violationService.decideAppeal(id, { decision: confirm, note: note.trim() || null })
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  if (error && !data) return <div className="desk-detail"><Link to="/leadership" className="desk-back"><Icon name="arrowLeft" size={16} />Hàng chờ phê duyệt</Link><Alert type="error">{error}</Alert></div>
  if (!data) return <div className="skeleton skeleton--page" />

  const pending = data.status === 'PENDING_FINAL'
  const accountStatus = STATUS_INFO[data.account.status]
  return (
    <div className="desk-detail">
      <Link to="/leadership" className="desk-back"><Icon name="arrowLeft" size={16} />Hàng chờ phê duyệt</Link>
      <Alert type="success">{notice}</Alert><Alert type="error">{error}</Alert>
      <div className="review-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header"><h2>Tài khoản</h2><Badge tone={accountStatus?.tone}>{accountStatus?.label ?? data.account.status}</Badge></div>
          <div className="applicant__head"><strong>{data.account.fullName}</strong><span className="applicant__id">{data.account.id} · {ROLE_LABELS[data.account.role] ?? data.account.role}</span></div>
          <dl className="applicant__facts"><div><dt>Email</dt><dd>{data.account.email}</dd></div><div><dt>Điểm uy tín</dt><dd>{data.account.reputationScore ?? 0}</dd></div><div><dt>Ngày gửi</dt><dd>{formatDateTime(data.createdAt)}</dd></div></dl>
        </aside>
        <div className="admin-stack">
          <section className="admin-panel">
            <div className="admin-panel__header"><h2>Khiếu nại mở khóa #{data.id}</h2><Badge tone={pending ? 'purple' : data.status === 'APPROVED' ? 'green' : 'red'}>{data.status}</Badge></div>
            <div><strong>Giải trình của người dùng</strong><p>{data.reason}</p></div>
            {data.evidenceNote && <div><strong>Bằng chứng / ghi chú</strong><p>{data.evidenceNote}</p></div>}
            <dl className="applicant__facts">
              <div><dt>Biên tập viên</dt><dd>{data.reviewer?.fullName ?? '—'}</dd></div>
              <div><dt>Nhận xét sơ duyệt</dt><dd>{data.reviewNote ?? '—'}</dd></div>
              <div><dt>Ngày sơ duyệt</dt><dd>{formatDateTime(data.reviewedAt)}</dd></div>
            </dl>
            {data.decisionNote && <Alert type="info" title="Ghi chú quyết định">{data.decisionNote}</Alert>}
          </section>
          {pending && (
            <section className="admin-panel review-box">
              <div className="admin-panel__header"><h2>Quyết định cuối cùng</h2><span>Phê duyệt mở khóa hoặc từ chối khiếu nại</span></div>
              <Alert type="info">Chỉ phê duyệt khi xác minh được giải trình. Duyệt sẽ kích hoạt lại tài khoản ngay lập tức.</Alert>
              <TextField label="Ghi chú quyết định" multiline rows={3} counter={2000} value={note} onChange={(event) => { setNote(event.target.value); setFormError('') }} hint="Bắt buộc nếu từ chối, tối thiểu 10 ký tự." error={formError} />
              <div className="review-box__actions">
                <Button variant="danger" onClick={() => askDecision('REJECT')}><Icon name="x" size={16} />Từ chối</Button>
                <Button onClick={() => askDecision('APPROVE')}><Icon name="check" size={16} />Phê duyệt mở khóa</Button>
              </div>
            </section>
          )}
        </div>
      </div>
      <ConfirmDialog open={Boolean(confirm)} title={confirm === 'REJECT' ? 'Từ chối khiếu nại' : 'Phê duyệt mở khóa'} message={confirm === 'REJECT' ? 'Khiếu nại sẽ bị đóng và tài khoản tiếp tục bị khóa.' : `Mở khóa tài khoản ${data.account.fullName}?`} confirmLabel={confirm === 'REJECT' ? 'Từ chối' : 'Mở khóa'} danger={confirm === 'REJECT'} onConfirm={decide} onClose={() => setConfirm('')} />
    </div>
  )
}

export default LeadershipAppealDetail
