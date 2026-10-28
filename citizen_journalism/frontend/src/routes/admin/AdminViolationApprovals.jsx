import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { VIOLATION_ACTIONS, VIOLATION_SEVERITIES, VIOLATION_STATUSES, VIOLATION_TYPES } from '../../lib/violations'
import { formatDateTime } from '../../lib/format'
import { violationService } from '../../services/violationService'

const PAGE_SIZE = 10
const TABS = [
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'RESOLVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: '', label: 'Tất cả' },
]

function AdminViolationApprovals() {
  const [status, setStatus] = useState('PENDING_APPROVAL')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const { data, error, loading } = useAsyncData(
    () => violationService.listApprovals({ status, keyword: debouncedKeyword, page, size: PAGE_SIZE }),
    JSON.stringify([status, debouncedKeyword, page]),
  )

  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={keyword}
            onChange={(event) => { setKeyword(event.target.value); setPage(0) }}
            placeholder="Tìm theo tên, email hoặc mã tài khoản"
            aria-label="Tìm báo cáo cần duyệt"
          />
        </label>
      </div>
      <div className="desk-tabs" role="tablist" aria-label="Lọc đề xuất theo trạng thái">
        {TABS.map((tab) => (
          <button
            key={tab.value || 'ALL'}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={status === tab.value ? 'is-active' : ''}
            onClick={() => { setStatus(tab.value); setPage(0) }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Alert type="error">{error}</Alert>
      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Báo cáo</th>
              <th>Biện pháp</th>
              <th>Mức độ</th>
              <th>Ngày lập báo cáo</th>
              <th>Trạng thái</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data && loading && Array.from({ length: 4 }, (_, index) => (
              <tr key={index}><td colSpan={7}><div className="skeleton skeleton--row" /></td></tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={7} className="data-table__empty"><Icon name="checkCircle" size={28} />Không có đề xuất trong mục này.</td></tr>
            )}
            {data?.items.map((item) => {
              const statusInfo = VIOLATION_STATUSES[item.status]
              const severity = VIOLATION_SEVERITIES[item.severity]
              return (
                <tr key={item.id}>
                  <td><strong>{item.userName}</strong><div className="data-table__note">{item.userId} · {item.userEmail}</div></td>
                  <td>{VIOLATION_TYPES[item.type] ?? item.type}</td>
                  <td>{VIOLATION_ACTIONS[item.proposedAction] ?? item.proposedAction ?? '—'}</td>
                  <td><Badge tone={severity?.tone}>{severity?.label ?? item.severity}</Badge></td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td><Badge tone={statusInfo?.tone}>{statusInfo?.label ?? item.status}</Badge></td>
                  <td className="data-table__actions">
                    <Link to={`/admin/violation-approvals/${item.id}`} className="desk-open">
                      {item.status === 'PENDING_APPROVAL' ? 'Duyệt' : 'Chi tiết'}
                      <Icon name="chevronDown" size={14} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data && <Pagination {...data} onChange={setPage} />}
    </section>
  )
}

export default AdminViolationApprovals