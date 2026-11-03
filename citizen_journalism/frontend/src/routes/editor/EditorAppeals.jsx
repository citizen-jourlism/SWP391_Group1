import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime } from '../../lib/format'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { violationService } from '../../services/violationService'
import AppealStatus from '../../components/appeals/AppealStatus'
import Button from '../../components/ui/Button'
import '../../assets/styles/appeals.css'

const TABS = [
  { value: 'PENDING_EDITOR', label: 'Chờ sơ duyệt' },
  { value: 'PENDING_FINAL', label: 'Đã chuyển cấp trên' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: '', label: 'Tất cả' },
]

function EditorAppeals({ scope = 'editor' }) {
  const leadership = scope === 'leadership'
  const [status, setStatus] = useState(leadership ? 'PENDING_FINAL' : 'PENDING_EDITOR')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const { data, error, loading, reload } = useAsyncData(
    () => (leadership ? violationService.listLeadershipAppeals : violationService.listEditorAppeals)({ status, keyword: debouncedKeyword, page, size: 10 }),
    JSON.stringify([scope, status, debouncedKeyword, page]),
  )

  return (
    <section className="admin-panel">
      <div className="appeal-heading"><div><h1>Xét duyệt khiếu nại xử phạt</h1><p>Review Account Penalty Appeals · {leadership ? 'Quyết định mở khóa tài khoản' : 'Tiếp nhận và sơ duyệt khiếu nại tài khoản'}</p></div><Button variant="secondary" onClick={reload} disabled={loading}>Làm mới</Button></div>
      <Alert type="info">{leadership ? 'Xem xét đề xuất từ Biên tập viên, đối chiếu lịch sử xử phạt và quyết định chấp thuận hoặc từ chối.' : 'Đối chiếu giải trình với lịch sử xử phạt, sau đó chuyển lãnh đạo phê duyệt hoặc từ chối kèm lý do.'}</Alert>
      <div className="admin-toolbar">
        <label className="search-box"><Icon name="search" size={18} /><input type="search" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(0) }} placeholder="Tìm tên, email hoặc mã tài khoản" aria-label="Tìm khiếu nại mở khóa" /></label>
      </div>
      <div className="desk-tabs" role="tablist" aria-label="Lọc khiếu nại theo trạng thái">
        {TABS.map((tab) => <button key={tab.value || 'ALL'} type="button" role="tab" aria-selected={status === tab.value} className={status === tab.value ? 'is-active' : ''} onClick={() => { setStatus(tab.value); setPage(0) }}>{tab.label}</button>)}
      </div>
      <Alert type="error">{error}</Alert>
      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead><tr><th>Tài khoản</th><th>Giải trình</th><th>Điểm uy tín</th><th>Ngày gửi</th><th>Trạng thái</th><th className="data-table__actions" aria-label="Thao tác" /></tr></thead>
          <tbody>
            {!data && loading && Array.from({ length: 4 }, (_, index) => <tr key={index}><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr>)}
            {data?.items.length === 0 && <tr><td colSpan={6} className="data-table__empty"><Icon name="checkCircle" size={28} />Không có khiếu nại trong mục này.</td></tr>}
            {data?.items.map((item) => {
              const info = STATUS_INFO[item.account.status]
              return <tr key={item.id}>
                <td><strong>{item.account.fullName}</strong><div className="data-table__note">{item.account.id} · {item.account.email} · {ROLE_LABELS[item.account.role] ?? item.account.role}</div><Badge tone={info?.tone}>{info?.label ?? item.account.status}</Badge></td>
                <td><strong>#{item.id}</strong><p title={item.reason}>{item.reason.length > 140 ? `${item.reason.slice(0, 140)}…` : item.reason}</p></td><td>{item.account.reputationScore ?? 0}</td><td>{formatDateTime(item.createdAt)}</td>
                <td><AppealStatus status={item.status} /></td>
                <td className="data-table__actions"><Link to={leadership ? `/leadership/approvals/appeals/${item.id}` : `/editor/appeals/${item.id}`} className="desk-open">{item.status === (leadership ? 'PENDING_FINAL' : 'PENDING_EDITOR') ? 'Xét duyệt' : 'Chi tiết'}<Icon name="chevronDown" size={14} /></Link></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {data && <Pagination {...data} onChange={setPage} />}
    </section>
  )
}

export default EditorAppeals
