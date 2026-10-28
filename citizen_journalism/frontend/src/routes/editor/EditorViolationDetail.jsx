import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import SelectField from '../../components/ui/SelectField'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { VIOLATION_ACTIONS, VIOLATION_SEVERITIES, VIOLATION_STATUSES, VIOLATION_TYPES } from '../../lib/violations'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { violationService } from '../../services/violationService'

const ACTION_OPTIONS = Object.entries(VIOLATION_ACTIONS).map(([value, label]) => ({ value, label }))

function EditorViolationDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => violationService.getForEditor(id), id)
  const [decision, setDecision] = useState('HANDLE')
  const [action, setAction] = useState('WARNING')
  const [points, setPoints] = useState('10')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState('')

  const submitReview = (nextDecision) => {
    const trimmedNote = note.trim()
    if (nextDecision === 'DISMISS' && trimmedNote.length < 10) {
      setFormError('Vui lòng ghi lý do bỏ qua, ít nhất 10 ký tự.')
      return
    }
    if (trimmedNote.length > 2000) {
      setFormError('Ghi chú tối đa 2000 ký tự.')
      return
    }
    const numericPoints = Number(points)
    if (['HANDLE', 'ESCALATE'].includes(nextDecision) && action === 'DEDUCT_POINTS' && (!Number.isInteger(numericPoints) || numericPoints < 1 || numericPoints > 100)) {
      setFormError('Số điểm trừ phải từ 1 đến 100.')
      return
    }
    if (['HANDLE', 'ESCALATE'].includes(nextDecision) && action === 'WARNING' && trimmedNote.length < 5) {
      setFormError('Vui lòng nhập nội dung cảnh báo, tối thiểu 5 ký tự.')
      return
    }
    if (['HANDLE', 'ESCALATE'].includes(nextDecision) && action === 'RETRACT_CONTENT' && trimmedNote.length < 20) {
      setFormError('Căn cứ pháp lý gỡ bài cần ít nhất 20 ký tự.')
      return
    }
    if (nextDecision === 'ESCALATE' && !['LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'RETRACT_CONTENT'].includes(action)) {
      setFormError('Chỉ chuyển cấp trên đề xuất khóa/mở khóa tài khoản hoặc gỡ nội dung.')
      return
    }
    setFormError('')
    setDecision(nextDecision)
    setConfirm(true)
  }

  const confirmReview = async () => {
    const response = await violationService.review(id, {
      decision,
      action: ['HANDLE', 'ESCALATE'].includes(decision) ? action : null,
      points: ['HANDLE', 'ESCALATE'].includes(decision) && action === 'DEDUCT_POINTS' ? Number(points) : null,
      note: note.trim() || null,
    })
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  if (error && !data) {
    return <div className="desk-detail"><Link to="/editor/members" className="desk-back"><Icon name="arrowLeft" size={16} />Uy tín & vi phạm</Link><Alert type="error">{error}</Alert></div>
  }
  if (!data) return <div className="skeleton skeleton--page" />

  const status = VIOLATION_STATUSES[data.status]
  const severity = VIOLATION_SEVERITIES[data.severity]
  const accountStatus = STATUS_INFO[data.account.status]
  const availableActions = ACTION_OPTIONS.filter(({ value }) => {
    if (value === 'LOCK_ACCOUNT') return data.account.status === 'ACTIVE'
    if (value === 'UNLOCK_ACCOUNT') return data.account.status === 'LOCKED'
    if (value === 'RETRACT_CONTENT') {
      return ['PUBLISHED', 'CORRECTED', 'READY_FOR_PUBLISHING'].includes(data.submission?.status)
    }
    return true
  })
  const pending = data.status === 'PENDING_REVIEW'

  return (
    <div className="desk-detail">
      <Link to="/editor/members" className="desk-back"><Icon name="arrowLeft" size={16} />Uy tín & vi phạm</Link>
      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>

      <div className="review-grid">
        <aside className="admin-panel">
          <div className="admin-panel__header"><h2>Tài khoản bị báo cáo</h2><Badge tone={accountStatus?.tone}>{accountStatus?.label ?? data.account.status}</Badge></div>
          <div className="applicant__head">
            <strong>{data.account.fullName}</strong>
            <span className="applicant__id">{data.account.id} · {ROLE_LABELS[data.account.role] ?? data.account.role}</span>
          </div>
          <dl className="applicant__facts">
            <div><dt>Email</dt><dd>{data.account.email}</dd></div>
            <div><dt>Điểm uy tín</dt><dd>{data.account.reputationScore ?? 0}</dd></div>
            <div><dt>Người lập</dt><dd>{data.reporter?.fullName ?? '—'} ({data.reporter?.id ?? '—'})</dd></div>
            <div><dt>Ngày lập</dt><dd>{formatDateTime(data.createdAt)}</dd></div>
          </dl>
        </aside>

        <div className="admin-stack">
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Báo cáo #{data.id}</h2>
              <Badge tone={status?.tone}>{status?.label ?? data.status}</Badge>
            </div>
            <dl className="applicant__facts">
              <div><dt>Loại vi phạm</dt><dd>{VIOLATION_TYPES[data.type] ?? data.type}</dd></div>
              <div><dt>Mức độ</dt><dd><Badge tone={severity?.tone}>{severity?.label ?? data.severity}</Badge></dd></div>
              <div><dt>Hồ sơ liên quan</dt><dd>{data.submission ? `${data.submission.trackingCode} · ${data.submission.title} (${data.submission.status})` : 'Không có'}</dd></div>
            </dl>
            <div><strong>Mô tả</strong><p>{data.description}</p></div>
            {data.evidenceNote && <div><strong>Ghi chú chứng cứ</strong><p>{data.evidenceNote}</p></div>}
            {data.proposedAction && <div><strong>Biện pháp đề xuất</strong><p>{VIOLATION_ACTIONS[data.proposedAction] ?? data.proposedAction}</p></div>}
            {data.reviewNote && <Alert type="info" title="Ghi chú xem xét">{data.reviewNote}</Alert>}
            {data.approvalNote && <Alert type="info" title="Ghi chú phê duyệt">{data.approvalNote}</Alert>}
          </section>

          {pending && (
            <section className="admin-panel review-box">
              <div className="admin-panel__header"><h2>Xem xét báo cáo</h2><span>Quyết định của biên tập viên</span></div>
              <SelectField
                label="Quyết định"
                options={[{ value: 'HANDLE', label: 'Xác nhận vi phạm và xử lý' }, { value: 'DISMISS', label: 'Bỏ qua báo cáo' }]}
                value={decision}
                onChange={(event) => { setDecision(event.target.value); setFormError('') }}
              />
              {decision === 'HANDLE' && (
                <>
                  <SelectField label="Biện pháp xử lý" options={availableActions} value={action} onChange={(event) => setAction(event.target.value)} />
                  {action === 'DEDUCT_POINTS' && <TextField label="Số điểm uy tín cần trừ" type="number" value={points} min="1" max="100" onChange={(event) => setPoints(event.target.value)} required />}
                  {['LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'RETRACT_CONTENT'].includes(action) && <Alert type="info">Biện pháp này cần Deputy EIC/EIC phê duyệt trước khi áp dụng.</Alert>}
                </>
              )}
              <TextField
                label="Ghi chú xét duyệt"
                multiline
                rows={3}
                counter={2000}
                hint={decision === 'DISMISS' ? 'Bắt buộc, tối thiểu 10 ký tự khi bỏ qua báo cáo.' : action === 'WARNING' ? 'Nội dung này sẽ được gửi trong email cảnh báo đến người dùng.' : action === 'RETRACT_CONTENT' ? 'Bắt buộc ghi căn cứ pháp lý (tối thiểu 20 ký tự). Nội dung hiện tại sẽ được lưu làm snapshot.' : 'Ghi rõ căn cứ xử lý hoặc lý do.'}
                value={note}
                onChange={(event) => { setNote(event.target.value); setFormError('') }}
                error={formError}
              />
              <div className="review-box__actions">
                <Button variant="danger" onClick={() => submitReview('DISMISS')}><Icon name="x" size={16} />Bỏ qua báo cáo</Button>
                <Button onClick={() => submitReview('HANDLE')}><Icon name="check" size={16} />Gửi quyết định</Button>
                {['LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'RETRACT_CONTENT'].includes(action) && (
                  <Button variant="secondary" onClick={() => submitReview('ESCALATE')}><Icon name="send" size={16} />Chuyển Deputy EIC/EIC</Button>
                )}
              </div>
            </section>
          )}

          <section className="admin-panel">
            <div className="admin-panel__header"><h2>Lịch sử uy tín gần đây</h2><span>20 lần thay đổi gần nhất</span></div>
            {data.reputationHistory?.length ? (
              <div className="table-wrap"><table className="data-table"><thead><tr><th>Ngày</th><th>Thay đổi</th><th>Lý do</th><th>Nội dung</th></tr></thead>
                <tbody>{data.reputationHistory.map((entry, index) => <tr key={`${entry.createdAt}-${index}`}><td>{formatDateTime(entry.createdAt)}</td><td>{entry.pointsChange > 0 ? '+' : ''}{entry.pointsChange}</td><td>{entry.reason}</td><td>{entry.trackingCode ? `${entry.trackingCode} · ${entry.submissionTitle ?? ''}` : '—'}</td></tr>)}</tbody>
              </table></div>
            ) : <p className="data-table__empty">Chưa có lịch sử thay đổi điểm uy tín.</p>}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={decision === 'DISMISS' ? 'Bỏ qua báo cáo vi phạm' : decision === 'ESCALATE' ? 'Chuyển đề xuất lên lãnh đạo' : 'Xác nhận xử lý vi phạm'}
        message={decision === 'DISMISS' ? 'Báo cáo sẽ được đóng mà không áp dụng biện pháp.' : decision === 'ESCALATE' ? `Chuyển “${VIOLATION_ACTIONS[action]}” cho Deputy EIC/EIC quyết định?` : `Áp dụng “${VIOLATION_ACTIONS[action]}” cho ${data.account.fullName}?`}
        confirmLabel={decision === 'DISMISS' ? 'Bỏ qua' : decision === 'ESCALATE' ? 'Chuyển cấp trên' : 'Xác nhận xử lý'}
        danger={decision === 'DISMISS'}
        onConfirm={confirmReview}
        onClose={() => setConfirm(false)}
      />
    </div>
  )
}

export default EditorViolationDetail