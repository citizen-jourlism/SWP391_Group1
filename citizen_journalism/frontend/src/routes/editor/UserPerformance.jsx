import { useState } from 'react'
import api from '../../lib/api'
import { useAsyncData } from '../../hooks/useAsyncData'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { ROLE_LABELS } from '../../lib/roles'

export default function UserPerformance() {
  const [keyword, setKeyword] = useState('')
  const { data, error, loading, reload } = useAsyncData(() => api.get('/editor/performance'), 'performance')
  const rows = data?.filter((u) => `${u.userId} ${u.fullName}`.toLowerCase().includes(keyword.toLowerCase()))
  return <section className="admin-panel"><h2>Đánh giá hiệu suất người dùng</h2>
    <p>Đánh giá trực tiếp từ hồ sơ và nhiệm vụ hiện tại. Tỷ lệ hoàn thành = nhiệm vụ hoàn thành / tổng nhiệm vụ đã giao.</p>
    <div className="admin-toolbar"><TextField label="Tìm tài khoản" value={keyword} onChange={(e) => setKeyword(e.target.value)} /><Button onClick={reload} loading={loading}>Đánh giá lại</Button></div>
    <Alert type="error">{error}</Alert><div className="table-wrap"><table className="data-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Điểm uy tín / hiệu suất CTV</th><th>Hồ sơ / đã đăng</th><th>Nhiệm vụ hoàn thành</th><th>Tỷ lệ</th><th>Đánh giá</th></tr></thead><tbody>
      {rows?.map((u) => <tr key={u.userId}><td>{u.fullName} ({u.userId})</td><td>{ROLE_LABELS[u.role]}</td><td>{(u.role === 'CONTRIBUTOR' ? u.performanceScore : u.reputationScore) ?? '—'}</td><td>{u.totalSubmissions} / {u.publishedSubmissions}</td><td>{u.completedAssignments} / {u.totalAssignments}</td><td>{u.completionRate}%</td><td>{u.evaluation}</td></tr>)}
      {rows?.length === 0 && <tr><td colSpan={7}>Không có tài khoản phù hợp.</td></tr>}
    </tbody></table></div>
  </section>
}
