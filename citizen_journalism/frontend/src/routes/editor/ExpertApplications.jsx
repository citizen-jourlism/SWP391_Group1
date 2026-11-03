import { useState } from 'react'
import api from '../../lib/api'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import SelectField from '../../components/ui/SelectField'
import Pagination from '../../components/ui/Pagination'
const STATUS_LABELS = { PENDING: 'Chờ xét duyệt', APPROVED: 'Đã chấp thuận', REJECTED: 'Đã từ chối' }

export function ExpertApplicationSection({ role }) {
  const { data, error, reload } = useAsyncData(() => api.get('/users/me/expert-applications'), 'expert-applications')
  const form = useForm({ field: '', qualifications: '', evidence: '' }, () => ({}))
  return <section className="admin-panel"><h2>Đăng ký chuyên gia</h2><Alert type="error">{error}</Alert>
    {['CITIZEN', 'CONTRIBUTOR'].includes(role) && !data?.some((a) => a.status === 'PENDING') && <form className="form" onSubmit={form.handleSubmit(async (values) => { await api.post('/users/me/expert-applications', values); form.reset(); reload() })}>
      <Alert type="error">{form.formError}</Alert><TextField label="Lĩnh vực chuyên môn" required maxLength={100} {...form.field('field')} />
      <TextField label="Bằng cấp, kinh nghiệm chuyên môn (ít nhất 20 ký tự)" multiline required minLength={20} maxLength={3000} {...form.field('qualifications')} />
      <TextField label="Nguồn xác thực bằng cấp / công trình / chứng chỉ" multiline rows={3} required maxLength={2000} {...form.field('evidence')} />
      <Button type="submit" loading={form.submitting}>Gửi đơn chuyên gia</Button>
    </form>}
    {data?.map((a) => <div key={a.id}><h3>Đơn #{a.id} · {a.field}</h3><p>{STATUS_LABELS[a.status]} · {a.createdAt}</p><p>{a.qualifications}</p><p>{a.evidence}</p>{a.reviewer && <p>{a.reviewer}: {a.note || 'Đã chấp thuận'}</p>}</div>)}
  </section>
}

export default function ExpertApplications() {
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(0)
  const { data, error, loading, reload } = useAsyncData(() => api.get('/editor/expert-applications', { params: { status, page, size: 10 } }), `${status}-${page}`)
  return <section className="admin-panel"><h2>Xét duyệt đăng ký chuyên gia</h2><Alert type="error">{error}</Alert>
    <SelectField label="Trạng thái" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} options={[{ value: 'PENDING', label: 'Chờ xét' }, { value: 'APPROVED', label: 'Đã duyệt' }, { value: 'REJECTED', label: 'Đã từ chối' }]} />
    {loading && <p role="status">Đang tải…</p>}{data?.items.map((a) => <section className="admin-panel" key={a.id}><h3>{a.fullName} ({a.userId}) · {a.field}</h3><p>{a.qualifications}</p><p>Chứng cứ chuyên môn: {a.evidence}</p><p>{STATUS_LABELS[a.status]} · {a.reviewer} · {a.note}</p>{a.status === 'PENDING' && <ExpertReview id={a.id} onSaved={reload} />}</section>)}
    {data?.items.length === 0 && <p>Không có đơn.</p>}{data && <Pagination {...data} onChange={setPage} />}
  </section>
}
function ExpertReview({ id, onSaved }) {
  const form = useForm({ approve: 'true', note: '' }, () => ({}))
  return <form className="form" onSubmit={form.handleSubmit(async (v) => { await api.post(`/editor/expert-applications/${id}/review`, { approve: v.approve === 'true', note: v.note }); onSaved() })}>
    <Alert type="error">{form.formError}</Alert><SelectField label="Kết quả" options={[{ value: 'true', label: 'Duyệt nâng cấp chuyên gia' }, { value: 'false', label: 'Từ chối' }]} {...form.field('approve')} />
    <TextField label="Ghi chú / lý do từ chối" maxLength={2000} {...form.field('note')} /><Button type="submit" loading={form.submitting}>Xác nhận kết quả</Button>
  </form>
}
