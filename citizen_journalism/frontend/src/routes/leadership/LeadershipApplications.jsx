import { useState } from 'react'
import api from '../../lib/api'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import SelectField from '../../components/ui/SelectField'
import Pagination from '../../components/ui/Pagination'

export default function LeadershipApplications() {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const { data, error, loading, reload } = useAsyncData(() => api.get('/leadership/applications', { params: { page, size: 10 } }), page)
  return <section className="admin-panel"><h2>Đơn Cộng tác viên chờ phê duyệt</h2><Alert type="error">{error}</Alert>{loading && <p role="status">Đang tải…</p>}
    {data?.items.map((a) => <p key={a.id}><Button variant="secondary" onClick={() => setSelected(a.id)}>Xem đơn #{a.id} — {a.fullName ?? a.applicantName ?? a.id}</Button></p>)}
    {data?.items.length === 0 && <p>Không có đơn chờ duyệt.</p>}{data && <Pagination {...data} onChange={setPage} />}
    {selected && <Application key={selected} id={selected} onSaved={() => { reload(); setSelected(null) }} />}
  </section>
}
function Application({ id, onSaved }) {
  const { data, error } = useAsyncData(() => api.get(`/leadership/applications/${id}`), id)
  const [downloadError, setDownloadError] = useState('')
  const form = useForm({ approve: 'true', note: '' }, () => ({}))
  const download = async (doc) => {
    setDownloadError('')
    try {
      const blob = await api.get(`/leadership/applications/${id}/documents/${doc.index}`, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = doc.name; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setDownloadError(e.message) }
  }
  return <section className="admin-panel"><Alert type="error">{error || downloadError}</Alert>{data && <>
    <h3>{data.applicant.fullName} ({data.applicant.id})</h3><p>{data.applicant.email} · {data.applicant.phone} · Uy tín: {data.applicant.reputationScore}</p>
    <p>{data.application.occupation} · {data.application.province}</p><p>{data.application.experience}</p><p>Biên tập viên: {data.application.editorNote}</p>
    {data.application.documents.map((doc) => <p key={doc.index}><Button variant="secondary" onClick={() => download(doc)}>Tải giấy tờ: {doc.name}</Button></p>)}
    {data.application.status === 'PENDING_DEPUTY' && <form className="form" onSubmit={form.handleSubmit(async (v) => {
      await api.post(`/leadership/applications/${id}/decision`, { approve: v.approve === 'true', note: v.note }); onSaved()
    })}><Alert type="error">{form.formError}</Alert><SelectField label="Kết quả" options={[{ value: 'true', label: 'Chấp thuận nâng cấp CTV' }, { value: 'false', label: 'Từ chối' }]} {...form.field('approve')} />
      <TextField label="Ghi chú / lý do" maxLength={1000} {...form.field('note')} /><Button type="submit" loading={form.submitting}>Lưu quyết định</Button></form>}
  </>}</section>
}
