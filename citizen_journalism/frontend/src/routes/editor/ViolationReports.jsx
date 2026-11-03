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
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime } from '../../lib/format'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import '../../assets/styles/violations.css'

const TYPES = { SPAM: 'Tin rác', FALSE_INFORMATION: 'Thông tin sai sự thật', INACCURATE_EVIDENCE: 'Chứng cứ sai', COPYRIGHT_VIOLATION: 'Vi phạm bản quyền', HARASSMENT: 'Quấy rối', POLICY_VIOLATION: 'Vi phạm chính sách', OTHER: 'Khác' }
const ACTIONS = { WARNING: 'Cảnh báo', DEDUCT_POINTS: 'Trừ điểm', LOCK_ACCOUNT: 'Khóa tài khoản', UNLOCK_ACCOUNT: 'Mở khóa tài khoản', RETRACT_CONTENT: 'Gỡ nội dung' }
const STATUS = { PENDING_REVIEW: 'Chờ xem xét', PENDING_APPROVAL: 'Chờ lãnh đạo duyệt', RESOLVED: 'Đã xử lý', DISMISSED: 'Đã bỏ qua', REJECTED: 'Đã từ chối' }
const SEVERITY = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' }
const STATUS_TONE = { PENDING_REVIEW: 'orange', PENDING_APPROVAL: 'purple', RESOLVED: 'green', DISMISSED: 'neutral', REJECTED: 'red' }
const options = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }))

export default function ViolationReports({ leadership = false }) {
  const [status, setStatus] = useState(leadership ? 'PENDING_APPROVAL' : '')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const base = leadership ? '/leadership/violations' : '/editor/violations'
  const search = useDebouncedValue(keyword.trim())
  const { data, error, loading, reload } = useAsyncData(() => api.get(base, { params: cleanParams({ status, keyword: search, page, size: 10 }) }), JSON.stringify([base, status, search, page]))
  return <div className="violation-page">
    <header className="violation-hero">
      <div className="violation-hero__icon"><Icon name="shield" size={28} /></div>
      <div><span className="violation-eyebrow">AN TOÀN CỘNG ĐỒNG</span><h1>{leadership ? 'Phê duyệt xử lý vi phạm' : 'Báo cáo vi phạm tài khoản'}</h1><p>Theo dõi báo cáo, đối chiếu bằng chứng và xử lý vi phạm một cách minh bạch.</p></div>
      <Button variant="secondary" onClick={reload} disabled={loading}><Icon name="activity" size={16} />Làm mới</Button>
    </header>
    <div className="violation-guide"><Icon name="info" size={18} /><p>{leadership ? 'Xem xét đề xuất và bằng chứng trước khi phê duyệt biện pháp xử lý.' : 'Cảnh báo và trừ điểm được xử lý tại bàn biên tập. Khóa tài khoản, mở khóa và gỡ nội dung cần lãnh đạo phê duyệt.'}</p></div>
    {!leadership && <CreateReport onCreated={reload} />}
    <section className="admin-panel violation-list" aria-busy={loading}>
    <div className="violation-list__heading"><div><h2>Danh sách báo cáo</h2><p>Tra cứu và theo dõi tiến trình xử lý tài khoản.</p></div>{data && <span className="violation-count">{data.totalItems} báo cáo</span>}</div>
    <div className="violation-tabs" aria-label="Lọc theo trạng thái">
      {[['', 'Tất cả'], ...Object.entries(STATUS)].map(([value, label]) => <button type="button" key={value} aria-pressed={status === value} className={status === value ? 'is-active' : ''} onClick={() => { setStatus(value); setPage(0) }}>{value && <span className={`violation-dot violation-dot--${STATUS_TONE[value]}`} />}{label}</button>)}
    </div>
    <div className="violation-search">
      <TextField label="Tìm kiếm tài khoản" icon="search" type="search" placeholder="Nhập mã tài khoản, họ tên hoặc email…" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0) }} />
      {(keyword || status) && <Button variant="secondary" onClick={() => { setKeyword(''); setStatus(''); setPage(0) }}>Xóa bộ lọc</Button>}
    </div>
    <Alert type="error">{error}</Alert>
    {loading && <p className="violation-loading" role="status">Đang tải báo cáo…</p>}
    <div className={`table-wrap ${loading ? 'is-loading' : ''}`}><table className="data-table violation-table"><thead><tr><th>Tài khoản bị báo cáo</th><th>Thông tin vi phạm</th><th>Trạng thái</th><th>Biện pháp đề xuất</th><th aria-label="Thao tác" /></tr></thead><tbody>
      {data?.items.map((v) => <tr key={v.id}><td><div className="violation-account"><span className="violation-avatar" aria-hidden="true">{(v.userName || '?').trim().slice(0, 1).toUpperCase()}</span><div><strong>{v.userName}</strong><span>{v.userId} · {v.userEmail}</span></div></div></td><td><strong>{TYPES[v.type] ?? v.type}</strong><div className="violation-meta"><Badge tone={['HIGH', 'CRITICAL'].includes(v.severity) ? 'red' : v.severity === 'MEDIUM' ? 'orange' : 'neutral'}>{SEVERITY[v.severity] ?? 'Chưa phân loại'}</Badge><span>#{v.id}</span></div><small>{formatDateTime(v.createdAt)}</small></td><td><Badge tone={STATUS_TONE[v.status]}>{STATUS[v.status] ?? v.status}</Badge></td><td><span className="violation-action">{ACTIONS[v.proposedAction] ?? 'Chờ đánh giá'}</span></td><td><Link className="violation-open" to={`${base}/${v.id}`}>Xem báo cáo <Icon name="eye" size={16} /></Link></td></tr>)}
      {data?.items.length === 0 && !loading && <tr><td colSpan={5}><div className="violation-empty"><Icon name="shield" size={36} /><h3>Chưa có báo cáo phù hợp</h3><p>{keyword || status ? 'Thử thay đổi từ khóa hoặc xóa bộ lọc để xem thêm báo cáo.' : 'Các báo cáo vi phạm mới sẽ xuất hiện tại đây.'}</p></div></td></tr>}
    </tbody></table></div>
    {data && <Pagination {...data} onChange={setPage} />}
  </section>
  </div>
}

function CreateReport({ onCreated }) {
  const [message, setMessage] = useState('')
  const form = useForm({ userId: '', trackingCode: '', type: 'FALSE_INFORMATION', severity: 'MEDIUM', description: '', evidenceNote: '' }, () => ({}))
  return <details className="violation-create"><summary><span className="violation-create__icon"><Icon name="fileText" size={21} /></span><span><strong>Lập báo cáo vi phạm mới</strong><small>Ghi nhận tài khoản, hành vi vi phạm và bằng chứng đối chiếu</small></span><Icon name="chevronDown" size={18} /></summary><form className="form violation-form" onSubmit={form.handleSubmit(async (values) => {
    await api.post('/editor/violations', values); form.reset(); setMessage('Đã lập báo cáo.'); onCreated()
  })}>
    <Alert type="error">{form.formError}</Alert><Alert type="success">{message}</Alert>
    <div className="violation-form__grid"><TextField label="Mã tài khoản" placeholder="Ví dụ: CT0001" required {...form.field('userId')} />
    <TextField label="Mã hồ sơ liên quan (nếu có)" placeholder="Nhập mã hồ sơ cần đối chiếu" {...form.field('trackingCode')} />
    <SelectField label="Loại vi phạm" options={options(TYPES)} {...form.field('type')} />
    <SelectField label="Mức độ" options={options(SEVERITY)} {...form.field('severity')} /></div>
    <TextField label="Mô tả hành vi vi phạm" placeholder="Mô tả rõ hành vi, thời điểm và nội dung vi phạm…" hint="Nhập từ 20 đến 3.000 ký tự." counter={3000} multiline rows={4} required minLength={20} maxLength={3000} {...form.field('description')} />
    <TextField label="Chứng cứ / nguồn đối chiếu" placeholder="Đường dẫn nguồn, trích dẫn hoặc thông tin giúp xác minh báo cáo…" multiline rows={3} maxLength={2000} counter={2000} {...form.field('evidenceNote')} />
    <div className="violation-form__footer"><span>Báo cáo được chuyển vào hàng chờ xem xét sau khi gửi.</span><Button type="submit" loading={form.submitting}><Icon name="shield" size={16} />Gửi báo cáo</Button></div>
  </form></details>
}

export function ViolationReportDetail({ leadership = false }) {
  const { id } = useParams()
  const base = leadership ? '/leadership/violations' : '/editor/violations'
  const { data, error, loading, reload } = useAsyncData(() => api.get(`${base}/${id}`), `${base}/${id}`)
  return <div className="violation-page violation-detail" aria-busy={loading}>
    <Link className="desk-back" to={base}><Icon name="arrowLeft" size={16} />Danh sách báo cáo vi phạm</Link>
    <Alert type="error">{error}</Alert>
    {error && <Button variant="secondary" onClick={reload}>Thử tải lại</Button>}
    {loading && !data && <div className="skeleton skeleton--page" aria-label="Đang tải báo cáo" />}
    {data && <>
      <header className="violation-hero">
        <div className="violation-hero__icon"><Icon name="fileText" size={28} /></div>
        <div><span className="violation-eyebrow">HỒ SƠ VI PHẠM #{data.id}</span><h1>{TYPES[data.type] ?? data.type}</h1><p>Lập ngày {formatDateTime(data.createdAt)} · Người lập: {data.reporter?.fullName ?? '—'}</p></div>
        <div className="violation-detail__status"><Badge tone={STATUS_TONE[data.status]}>{STATUS[data.status] ?? data.status}</Badge><Badge tone={['HIGH', 'CRITICAL'].includes(data.severity) ? 'red' : 'orange'}>Mức độ: {SEVERITY[data.severity] ?? '—'}</Badge></div>
      </header>
      <div className="violation-detail__grid">
        <aside className="violation-detail__sidebar">
          <section className="admin-panel">
            <div className="violation-card-title"><Icon name="user" size={18} /><h2>Tài khoản bị báo cáo</h2></div>
            <div className="violation-profile"><span className="violation-avatar">{(data.account.fullName || '?').trim().slice(0, 1).toUpperCase()}</span><div><strong>{data.account.fullName}</strong><span>{data.account.id}</span></div></div>
            <Badge tone={STATUS_INFO[data.account.status]?.tone}>{STATUS_INFO[data.account.status]?.label ?? data.account.status}</Badge>
            <dl className="violation-facts"><div><dt>Email</dt><dd>{data.account.email}</dd></div><div><dt>Vai trò</dt><dd>{ROLE_LABELS[data.account.role] ?? data.account.role}</dd></div></dl>
            <div className="violation-score"><span>Điểm uy tín hiện tại</span><strong>{data.account.reputationScore ?? '—'}<small> / 100</small></strong><p>Điểm tại thời điểm xem hồ sơ</p></div>
          </section>
          {data.submission && <section className="admin-panel"><div className="violation-card-title"><Icon name="fileText" size={18} /><h2>Hồ sơ liên quan</h2></div><span className="violation-eyebrow">{data.submission.trackingCode}</span><p className="violation-prose">{data.submission.title}</p><Badge tone="neutral">{data.submission.status}</Badge></section>}
        </aside>
        <div className="violation-detail__main">
          <section className="admin-panel"><div className="violation-card-title"><Icon name="shield" size={18} /><h2>Nội dung báo cáo</h2></div><h3 className="violation-section-label">Mô tả hành vi vi phạm</h3><p className="violation-prose">{data.description}</p><div className="violation-evidence"><div className="violation-card-title"><Icon name="search" size={17} /><h3>Bằng chứng và nguồn đối chiếu</h3></div><p className="violation-prose">{data.evidenceNote || 'Chưa cung cấp bằng chứng bổ sung.'}</p></div>
            {data.retractionSnapshot && <details className="violation-snapshot"><summary>Nội dung lưu trước khi gỡ</summary><p className="violation-prose">{data.retractionSnapshot}</p></details>}
          </section>
          <section className="admin-panel"><div className="violation-card-title"><Icon name="clock" size={18} /><h2>Tiến trình xử lý</h2></div>
            <ol className="violation-timeline"><li><strong>Tiếp nhận báo cáo</strong><p>{data.reporter?.fullName ?? '—'} · {formatDateTime(data.createdAt)}</p></li>
              <li><strong>{data.reviewer ? 'Đã xem xét và đề xuất' : 'Chờ Biên tập viên xem xét'}</strong>{data.reviewer && <p>{data.reviewer.fullName} · {formatDateTime(data.reviewedAt)}</p>}<p>Biện pháp: {ACTIONS[data.proposedAction] ?? 'Chưa có đề xuất'}{data.pointsDeducted != null ? ` · Trừ ${data.pointsDeducted} điểm` : ''}</p>{data.reviewNote && <p className="violation-prose">{data.reviewNote}</p>}</li>
              {data.approver && <li><strong>Quyết định của lãnh đạo</strong><p>{data.approver.fullName} · {formatDateTime(data.approvedAt)}</p><p className="violation-prose">{data.approvalNote || 'Không có ghi chú bổ sung.'}</p></li>}
            </ol>
          </section>
          {['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(data.status) && (leadership || !['LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'RETRACT_CONTENT'].includes(data.proposedAction)) && <section className="admin-panel violation-decision"><div className="violation-card-title"><Icon name="checkCircle" size={18} /><h2>{leadership ? 'Phê duyệt quyết định' : 'Xem xét và xử lý'}</h2></div><p className="violation-card-description">Chọn hướng xử lý và ghi rõ căn cứ sau khi đối chiếu nội dung, bằng chứng.</p><Decision key={`${id}-${data.status}`} data={data} leadership={leadership} base={base} onSaved={reload} /></section>}
          {!leadership && data.status === 'PENDING_APPROVAL' && data.proposedAction && <Alert type="info" title="Đang chờ phê duyệt">Đề xuất đã được trình lãnh đạo. Kết quả sẽ được cập nhật tại hồ sơ này.</Alert>}
          <section className="admin-panel"><div className="violation-card-title"><Icon name="activity" size={18} /><h2>Lịch sử điểm uy tín</h2></div>
            {data.reputationHistory?.length ? <div className="table-wrap"><table className="data-table violation-history"><thead><tr><th>Thời gian</th><th>Thay đổi</th><th>Lý do</th></tr></thead><tbody>{data.reputationHistory.map((entry, i) => <tr key={i}><td>{formatDateTime(entry.createdAt)}</td><td><Badge tone={entry.pointsChange > 0 ? 'green' : entry.pointsChange < 0 ? 'red' : 'neutral'}>{entry.pointsChange > 0 ? '+' : ''}{entry.pointsChange} điểm</Badge></td><td>{REPUTATION_REASONS[entry.reason] ?? entry.reason}{entry.submissionTitle && <div className="data-table__note">{entry.trackingCode} · {entry.submissionTitle}</div>}</td></tr>)}</tbody></table></div> : <p className="violation-card-description">Chưa có biến động điểm uy tín được ghi nhận.</p>}
          </section>
        </div>
      </div>
    </>}
  </div>
}

const REPUTATION_REASONS = {
  INITIAL_CONTRIBUTOR_ONBOARDING: 'Điểm khởi tạo cộng tác viên', SUBMISSION_APPROVED: 'Hồ sơ được duyệt',
  EDITOR_APPROVED_SUBMISSION: 'Biên tập viên duyệt hồ sơ', CITIZEN_SUBMISSION_PUBLISHED: 'Tin bài được xuất bản',
  CITIZEN_SUBMISSION_FAKE_NEWS: 'Tin bài sai sự thật', EXPERT_ARTICLE_FAKE_NEWS: 'Bài chuyên gia sai sự thật',
  ACCOUNT_APPEAL_RESTORED: 'Khôi phục điểm sau khiếu nại', EXPERT_RESEARCH_APPROVED: 'Bài nghiên cứu được duyệt',
  TASK_COMPLETED_ON_TIME: 'Hoàn thành nhiệm vụ đúng hạn', TASK_LATE: 'Nhiệm vụ trễ hạn',
  INACCURATE_EVIDENCE: 'Bằng chứng không chính xác', SPAM_REPORTED: 'Vi phạm tin rác', COPYRIGHT_VIOLATION: 'Vi phạm bản quyền',
}

function Decision({ data, leadership, base, onSaved }) {
  const labels = leadership ? { LOCK_ACCOUNT: ACTIONS.LOCK_ACCOUNT, UNLOCK_ACCOUNT: ACTIONS.UNLOCK_ACCOUNT, RETRACT_CONTENT: ACTIONS.RETRACT_CONTENT } : ACTIONS
  const form = useForm({ decision: leadership ? 'APPROVE' : 'HANDLE', action: data.proposedAction || (leadership ? 'LOCK_ACCOUNT' : 'WARNING'), points: '1', note: '' }, () => ({}))
  return <form className="form" onSubmit={form.handleSubmit(async (values) => {
    await api.post(`${base}/${data.id}/${leadership ? 'decision' : 'review'}`, { ...values, points: values.action === 'DEDUCT_POINTS' ? Number(values.points) : null }); onSaved()
  })}>
    <Alert type="error">{form.formError}</Alert>
    <div className="violation-form__grid"><SelectField label="Quyết định" options={options(leadership ? { APPROVE: 'Phê duyệt', REJECT: 'Từ chối' } : { HANDLE: 'Xử lý', ESCALATE: 'Trình lãnh đạo', DISMISS: 'Bỏ qua báo cáo' })} {...form.field('decision')} />
    <SelectField label="Biện pháp" options={options(labels)} disabled={leadership && Boolean(data.proposedAction)} {...form.field('action')} /></div>
    {form.values.action === 'DEDUCT_POINTS' && <TextField label="Số điểm trừ" type="number" min={1} max={100} {...form.field('points')} />}
    <TextField label="Lý do / căn cứ xử lý" placeholder="Ghi rõ kết quả đối chiếu và căn cứ cho quyết định…" multiline rows={4} maxLength={2000} counter={2000} {...form.field('note')} />
    <div className="violation-form__footer"><span>Kiểm tra biện pháp và căn cứ xử lý trước khi lưu.</span><Button type="submit" loading={form.submitting}><Icon name="check" size={16} />Lưu quyết định</Button></div>
  </form>
}
