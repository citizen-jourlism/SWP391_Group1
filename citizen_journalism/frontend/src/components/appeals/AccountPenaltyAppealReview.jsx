import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Icon from '../ui/Icon'
import TextField from '../ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { violationService } from '../../services/violationService'
import AppealStatus from './AppealStatus'
import AppealPenaltyHistory from './AppealPenaltyHistory'
import '../../assets/styles/appeals.css'

export default function AccountPenaltyAppealReview({ id, scope }) {
  const leadership = scope === 'leadership'
  const { data, error, loading, reload, setData } = useAsyncData(
    () => leadership ? violationService.getLeadershipAppeal(id) : violationService.getEditorAppeal(id),
    `${scope}/${id}`,
  )
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')

  const askDecision = (decision) => {
    if (note.trim().length > 2000 || (decision === 'REJECT' && note.trim().length < 10)) {
      setFormError('Lý do từ chối cần ít nhất 10 ký tự. Ghi chú tối đa 2.000 ký tự.')
      return
    }
    setFormError('')
    setConfirm(decision)
  }
  const decide = async () => {
    const payload = { decision: confirm, note: note.trim() || null }
    const response = await (leadership
      ? violationService.decideAppeal(id, payload)
      : violationService.reviewAppeal(id, payload))
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  const back = <Link to={`/${scope}/appeals`} className="desk-back"><Icon name="arrowLeft" size={16} />Danh sách khiếu nại xử phạt</Link>
  if (!data) return <div className="desk-detail">{back}{error ? <><Alert type="error">{error}</Alert><Button onClick={reload} variant="secondary">Thử lại</Button></> : <div className="skeleton skeleton--page" />}</div>

  const pending = data.status === (leadership ? 'PENDING_FINAL' : 'PENDING_EDITOR')
  const accountStatus = STATUS_INFO[data.account.status]
  return (
    <div className="desk-detail appeal-review" aria-busy={loading}>
      {back}
      <div className="appeal-heading"><div><h1>Xét duyệt khiếu nại xử phạt</h1><p>Hồ sơ #{data.id} · Gửi lúc {formatDateTime(data.createdAt)}</p></div><AppealStatus status={data.status} /></div>
      <Alert type="success">{notice}</Alert><Alert type="error">{error}</Alert>
      <ol className="appeal-progress" aria-label="Tiến trình khiếu nại">
        <li>1. Đã tiếp nhận</li>
        <li aria-current={data.status === 'PENDING_EDITOR' ? 'step' : undefined}>2. Biên tập viên sơ duyệt</li>
        <li aria-current={data.status === 'PENDING_FINAL' ? 'step' : undefined}>3. Quyết định cuối</li>
        <li aria-current={['APPROVED', 'REJECTED'].includes(data.status) ? 'step' : undefined}>4. Kết quả</li>
      </ol>
      <div className="review-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header"><h2>Tài khoản khiếu nại</h2><Badge tone={accountStatus?.tone}>{accountStatus?.label ?? data.account.status}</Badge></div>
          <div className="applicant__head"><strong>{data.account.fullName}</strong><span className="applicant__id">{data.account.id}</span></div>
          <dl className="applicant__facts">
            <div><dt>Email</dt><dd>{data.account.email}</dd></div>
            <div><dt>Vai trò</dt><dd>{ROLE_LABELS[data.account.role] ?? data.account.role}</dd></div>
            <div><dt>Điểm uy tín hiện tại</dt><dd>{data.account.reputationScore ?? 0}</dd></div>
          </dl>
          <Alert type="info">Biên tập viên sơ duyệt và chuyển hồ sơ. Phó Tổng biên tập quyết định mở khóa hoặc giữ nguyên hình phạt.</Alert>
        </aside>
        <div className="admin-stack">
          <section className="admin-panel">
            <div className="admin-panel__header"><h2>Nội dung khiếu nại</h2></div>
            <strong>Giải trình của người dùng</strong><p className="appeal-text">{data.reason}</p>
            <strong>Bằng chứng / ghi chú</strong><p className="appeal-text">{data.evidenceNote || 'Người dùng chưa cung cấp bằng chứng bổ sung.'}</p>
          </section>
          <AppealPenaltyHistory key={`${scope}/${id}`} scope={scope} appealId={id} />
          <section className="admin-panel">
            <div className="admin-panel__header"><h2>Lịch sử xét duyệt</h2></div>
            <dl className="applicant__facts">
              <div><dt>Tiếp nhận</dt><dd>{formatDateTime(data.createdAt)}</dd></div>
              <div><dt>Người sơ duyệt</dt><dd>{data.reviewer?.fullName ?? 'Chưa sơ duyệt'} · {formatDateTime(data.reviewedAt)}</dd></div>
              {data.reviewNote && <div><dt>Nhận xét sơ duyệt</dt><dd className="appeal-text">{data.reviewNote}</dd></div>}
              <div><dt>Người quyết định cuối</dt><dd>{data.decisionMaker?.fullName ?? 'Chưa có quyết định cuối'} · {formatDateTime(data.decidedAt)}</dd></div>
              {data.decisionNote && <div><dt>Lý do quyết định</dt><dd className="appeal-text">{data.decisionNote}</dd></div>}
            </dl>
          </section>
          {pending ? <section className="admin-panel review-box">
            <div className="admin-panel__header"><h2>{leadership ? 'Quyết định cuối cùng' : 'Sơ duyệt khiếu nại'}</h2></div>
            <Alert type="info">{leadership ? `Chấp thuận sẽ mở khóa tài khoản và khôi phục điểm uy tín về ${Math.max(data.account.reputationScore ?? 100, 80)} theo quy định hiện tại. Từ chối sẽ giữ nguyên hình phạt.` : 'Chuyển hồ sơ để Phó Tổng biên tập quyết định. Từ chối sẽ đóng khiếu nại và giữ nguyên hình phạt.'}</Alert>
            <TextField label="Nhận xét và lý do xử lý" multiline rows={4} maxLength={2000} counter={2000} value={note} onChange={(event) => { setNote(event.target.value); setFormError('') }} hint="Bắt buộc khi từ chối, ít nhất 10 ký tự." error={formError} />
            <div className="review-box__actions">
              <Button variant="danger" onClick={() => askDecision('REJECT')} disabled={loading}><Icon name="x" size={16} />Từ chối khiếu nại</Button>
              <Button onClick={() => askDecision(leadership ? 'APPROVE' : 'FORWARD')} disabled={loading}><Icon name="check" size={16} />{leadership ? 'Chấp thuận mở khóa' : 'Trình lãnh đạo phê duyệt'}</Button>
            </div>
          </section> : <Alert type="info">{data.status === 'PENDING_FINAL' ? 'Hồ sơ đang chờ Phó Tổng biên tập quyết định.' : data.status === 'PENDING_EDITOR' ? 'Hồ sơ cần được Biên tập viên sơ duyệt trước.' : 'Hồ sơ đã hoàn tất xử lý. Kết quả được lưu trong lịch sử xét duyệt.'}</Alert>}
        </div>
      </div>
      <ConfirmDialog open={Boolean(confirm)} title={confirm === 'REJECT' ? 'Từ chối khiếu nại' : leadership ? 'Chấp thuận mở khóa tài khoản' : 'Chuyển hồ sơ lên lãnh đạo'} message={confirm === 'REJECT' ? 'Đóng khiếu nại và giữ nguyên hình phạt tài khoản? Lý do xử lý sẽ được lưu lại.' : leadership ? `Mở khóa tài khoản ${data.account.fullName} và khôi phục điểm uy tín về ${Math.max(data.account.reputationScore ?? 100, 80)}?` : 'Chuyển hồ sơ cùng nhận xét đến Phó Tổng biên tập để quyết định cuối?'} confirmLabel={confirm === 'REJECT' ? 'Xác nhận từ chối' : leadership ? 'Xác nhận mở khóa' : 'Chuyển hồ sơ'} danger={confirm === 'REJECT'} onConfirm={decide} onClose={() => setConfirm('')} />
    </div>
  )
}
