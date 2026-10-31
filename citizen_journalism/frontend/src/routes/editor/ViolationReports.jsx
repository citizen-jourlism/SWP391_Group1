import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../lib/api'
import { cleanParams } from '../../lib/payload'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import SelectField from '../../components/ui/SelectField'
import Pagination from '../../components/ui/Pagination'

const TYPES = { SPAM: 'Tin rác', FALSE_INFORMATION: 'Thông tin sai sự thật', INACCURATE_EVIDENCE: 'Chứng cứ sai', COPYRIGHT_VIOLATION: 'Vi phạm bản quyền', HARASSMENT: 'Quấy rối', POLICY_VIOLATION: 'Vi phạm chính sách', OTHER: 'Khác' }
const ACTIONS = { WARNING: 'Cảnh báo', DEDUCT_POINTS: 'Trừ điểm', LOCK_ACCOUNT: 'Khóa tài khoản', UNLOCK_ACCOUNT: 'Mở khóa tài khoản', RETRACT_CONTENT: 'Gỡ nội dung' }
const STATUS = { PENDING_REVIEW: 'Chờ xem xét', PENDING_APPROVAL: 'Chờ lãnh đạo duyệt', RESOLVED: 'Đã xử lý', DISMISSED: 'Đã bỏ qua', REJECTED: 'Đã từ chối' }
const options = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

export default function ViolationReports({ leadership = false }) {
  const [status, setStatus] = useState(leadership ? 'PENDING_APPROVAL' : '')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const base = leadership ? '/leadership/violations' : '/editor/violations'
  const { data, error, loading, reload } = useAsyncData(() => api.get(base, { params: cleanParams({ status, keyword, page, size: 10 }) }), JSON.stringify([base, status, keyword, page]))
  return <section className="admin-panel">
    <h2>{leadership ? 'Phê duyệt xử lý vi phạm' : 'Báo cáo vi phạm tài khoản'}</h2>
    {!leadership && <CreateReport onCreated={reload} />}
    <div className="admin-toolbar">
      <TextField label="Tìm tài khoản" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0) }} />
      <SelectField label="Trạng thái" placeholder="Tất cả" options={options(STATUS)} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} />
    </div>
    <Alert type="error">{error}</Alert>
    {loading && <p role="status">Đang tải…</p>}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Tài khoản</th><th>Vi phạm</th><th>Trạng thái</th><th>Đề xuất</th><th /></tr></thead><tbody>
      {data?.items.map((v) => <tr key={v.id}><td>{v.userName} ({v.userId})</td><td>{TYPES[v.type]}</td><td>{STATUS[v.status]}</td><td>{ACTIONS[v.proposedAction] ?? 'Chưa chọn'}</td><td><Link to={`${base}/${v.id}`}>Xem báo cáo</Link></td></tr>)}
      {data?.items.length === 0 && <tr><td colSpan={5}>Không có báo cáo.</td></tr>}
    </tbody></table></div>
    {data && <Pagination {...data} onChange={setPage} />}
  </section>
}

function CreateReport({ onCreated }) {
  const [message, setMessage] = useState('')
  const form = useForm({ userId: '', trackingCode: '', type: 'FALSE_INFORMATION', severity: 'MEDIUM', description: '', evidenceNote: '' }, () => ({}))
  return <details><summary>Lập báo cáo mới</summary><form className="form" onSubmit={form.handleSubmit(async (values) => {
    await api.post('/editor/violations', values); form.reset(); setMessage('Đã lập báo cáo.'); onCreated()
  })}>
    <Alert type="error">{form.formError}</Alert><Alert type="success">{message}</Alert>
    <TextField label="Mã tài khoản" required {...form.field('userId')} />
    <TextField label="Mã hồ sơ liên quan (nếu có)" {...form.field('trackingCode')} />
    <SelectField label="Loại vi phạm" options={options(TYPES)} {...form.field('type')} />
    <SelectField label="Mức độ" options={options({ LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' })} {...form.field('severity')} />
    <TextField label="Mô tả vi phạm (20–3000 ký tự)" multiline required minLength={20} maxLength={3000} {...form.field('description')} />
    <TextField label="Chứng cứ / nguồn đối chiếu" multiline rows={3} maxLength={2000} {...form.field('evidenceNote')} />
    <Button type="submit" loading={form.submitting}>Lập báo cáo</Button>
  </form></details>
}

export function ViolationReportDetail({ leadership = false }) {
  const { id } = useParams()
  const base = leadership ? '/leadership/violations' : '/editor/violations'
  const { data, error, loading, reload } = useAsyncData(() => api.get(`${base}/${id}`), `${base}/${id}`)
  return <section className="admin-panel">
    <Link to={base}>← Danh sách báo cáo</Link><Alert type="error">{error}</Alert>
    {loading && <p role="status">Đang tải…</p>}
    {data && <><h2>Báo cáo #{data.id} — {data.account.fullName}</h2>
      <p>{data.account.id} · {data.account.email} · {data.account.status} · Điểm uy tín: {data.account.reputationScore ?? '—'}</p>
      <p>{TYPES[data.type]} · {STATUS[data.status]}</p><p style={{ whiteSpace: 'pre-wrap' }}>{data.description}</p>
      <p>Chứng cứ: {data.evidenceNote || 'Chưa cung cấp'}</p>
      {data.submission && <p>Hồ sơ: {data.submission.trackingCode} — {data.submission.title} ({data.submission.status})</p>}
      <p>Người lập: {data.reporter?.fullName}</p>
      <p>Đề xuất: {ACTIONS[data.proposedAction] ?? 'Chưa chọn'} · {data.reviewNote}</p>
      {data.approver && <p>Quyết định: {data.approver.fullName} · {data.approvalNote}</p>}
      {data.retractionSnapshot && <details><summary>Nội dung lưu trước khi gỡ</summary><p style={{ whiteSpace: 'pre-wrap' }}>{data.retractionSnapshot}</p></details>}
      {['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(data.status) && (leadership || !['LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'RETRACT_CONTENT'].includes(data.proposedAction)) && <Decision key={`${id}-${data.status}`} data={data} leadership={leadership} base={base} onSaved={reload} />}
      {!leadership && data.status === 'PENDING_APPROVAL' && data.proposedAction && <p>Đề xuất đã trình lãnh đạo phê duyệt.</p>}
      <h3>Lịch sử điểm uy tín</h3>{data.reputationHistory.map((entry, i) => <p key={i}>{entry.createdAt} · {entry.pointsChange} · {entry.reason}</p>)}
    </>}
  </section>
}

function Decision({ data, leadership, base, onSaved }) {
  const labels = leadership ? { LOCK_ACCOUNT: ACTIONS.LOCK_ACCOUNT, UNLOCK_ACCOUNT: ACTIONS.UNLOCK_ACCOUNT, RETRACT_CONTENT: ACTIONS.RETRACT_CONTENT } : ACTIONS
  const form = useForm({ decision: leadership ? 'APPROVE' : 'HANDLE', action: data.proposedAction || (leadership ? 'LOCK_ACCOUNT' : 'WARNING'), points: '1', note: '' }, () => ({}))
  return <form className="form" onSubmit={form.handleSubmit(async (values) => {
    await api.post(`${base}/${data.id}/${leadership ? 'decision' : 'review'}`, { ...values, points: values.action === 'DEDUCT_POINTS' ? Number(values.points) : null }); onSaved()
  })}>
    <Alert type="error">{form.formError}</Alert>
    <SelectField label="Quyết định" options={options(leadership ? { APPROVE: 'Phê duyệt', REJECT: 'Từ chối' } : { HANDLE: 'Xử lý', ESCALATE: 'Trình lãnh đạo', DISMISS: 'Bỏ qua báo cáo' })} {...form.field('decision')} />
    <SelectField label="Biện pháp" options={options(labels)} disabled={leadership && Boolean(data.proposedAction)} {...form.field('action')} />
    {form.values.action === 'DEDUCT_POINTS' && <TextField label="Số điểm trừ" type="number" min={1} max={100} {...form.field('points')} />}
    <TextField label="Lý do / căn cứ xử lý" multiline rows={3} maxLength={2000} {...form.field('note')} />
    <Button type="submit" loading={form.submitting}>Lưu quyết định</Button>
  </form>
}
