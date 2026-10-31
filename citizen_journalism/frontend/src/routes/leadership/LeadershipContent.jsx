import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../lib/api'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import { useAuth } from '../../hooks/useAuth'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import SelectField from '../../components/ui/SelectField'
import Pagination from '../../components/ui/Pagination'
import { SUBMISSION_STATUS } from '../../lib/submission'
import { PRIORITY_INFO } from '../../lib/researchEditorial'

export default function LeadershipContent() {
  const [kind, setKind] = useState('submissions')
  const [page, setPage] = useState(0)
  const { data, error, loading } = useAsyncData(() => api.get(`/leadership/content/${kind}`, { params: { page, size: 10 } }), `${kind}-${page}`)
  return <section className="admin-panel"><h2>Nội dung chờ phê duyệt</h2>
    <SelectField label="Loại nội dung" value={kind} onChange={(e) => { setKind(e.target.value); setPage(0) }} options={[{ value: 'submissions', label: 'Tin nóng / phản ánh / bài CTV' }, { value: 'research', label: 'Bài nghiên cứu' }]} />
    <Alert type="error">{error}</Alert>{loading && <p role="status">Đang tải…</p>}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Mã</th><th>Tiêu đề</th><th>Mức độ</th><th /></tr></thead><tbody>
      {data?.items.map((item) => <tr key={item.id}><td>{item.code}</td><td>{item.title}</td><td>{PRIORITY_INFO[item.priority]?.label ?? 'Khẩn cấp'}</td><td><Link to={`/leadership/content/${kind}/${item.id}`}>Xem và duyệt</Link></td></tr>)}
      {data?.items.length === 0 && <tr><td colSpan={4}>Không có nội dung chờ cấp của bạn phê duyệt.</td></tr>}
    </tbody></table></div>{data && <Pagination {...data} onChange={setPage} />}
  </section>
}

export function LeadershipContentDetail() {
  const { kind, id } = useParams()
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsyncData(() => api.get(`/leadership/content/${kind}/${id}`), `${kind}-${id}`)
  const form = useForm({ decision: 'APPROVE', note: '' }, () => ({}))
  const pending = data?.status === (user.role === 'EIC' ? 'EIC_PENDING' : 'DEPUTY_PENDING')
  return <section className="admin-panel"><Link to="/leadership/content">← Nội dung chờ duyệt</Link>
    <Alert type="error">{error}</Alert>{loading && <p role="status">Đang tải…</p>}
    {data && <><h2>{data.code} — {data.title}</h2><p>{data.author} · {data.field} · {PRIORITY_INFO[data.priority]?.label ?? 'Khẩn cấp'} · {SUBMISSION_STATUS[data.status]?.label ?? data.status}</p>
      <article style={{ whiteSpace: 'pre-wrap' }}>{data.content}</article>
      {pending ? <form className="form" onSubmit={form.handleSubmit(async (values) => { await api.post(`/leadership/content/${kind}/${id}/decision`, values); reload() })}>
        <p>Tin mức cao/khẩn cấp được chuyển Tổng biên tập sau khi Phó Tổng biên tập chấp thuận.</p>
        <Alert type="error">{form.formError}</Alert>
        <SelectField label="Quyết định" options={[{ value: 'APPROVE', label: 'Chấp thuận' }, { value: 'REJECT', label: 'Từ chối' }, ...(user.role === 'DEPUTY_EIC' ? [{ value: 'ESCALATE', label: 'Chuyển Tổng biên tập' }] : [])]} {...form.field('decision')} />
        <TextField label="Ghi chú / lý do" maxLength={2000} {...form.field('note')} /><Button type="submit" loading={form.submitting}>Lưu quyết định</Button>
      </form> : <Alert type="success">Nội dung đã chuyển bước: {SUBMISSION_STATUS[data.status]?.label ?? data.status}</Alert>}
    </>}
  </section>
}
