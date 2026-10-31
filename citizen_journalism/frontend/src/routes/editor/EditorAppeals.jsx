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

const TABS = [
  { value: 'PENDING_EDITOR', label: 'Chờ sơ duyệt' },
  { value: 'PENDING_FINAL', label: 'Đã chuyển cấp trên' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: '', label: 'Tất cả' },
]

function EditorAppeals() {
  const [status, setStatus] = useState('PENDING_EDITOR')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const { data, error, loading } = useAsyncData(
    () => violationService.listEditorAppeals({ status, keyword: debouncedKeyword, page, size: 10 }),
    JSON.stringify([status, debouncedKeyword, page]),
  )

  return (
    <section className="admin-panel">
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
                <td>{item.reason}</td><td>{item.account.reputationScore ?? 0}</td><td>{formatDateTime(item.createdAt)}</td>
                <td><Badge tone={item.status === 'PENDING_EDITOR' ? 'orange' : item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'purple'}>{item.status}</Badge></td>
                <td className="data-table__actions"><Link to={`/editor/appeals/${item.id}`} className="desk-open">{item.status === 'PENDING_EDITOR' ? 'Sơ duyệt' : 'Chi tiết'}<Icon name="chevronDown" size={14} /></Link></td>
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
