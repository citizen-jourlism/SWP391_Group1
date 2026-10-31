import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime } from '../../lib/format'
import { violationService } from '../../services/violationService'

const PAGE_SIZE = 10
const STATUS_TABS = [
  { value: 'PENDING_FINAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: '', label: 'Tất cả' },
]

function LeadershipApprovals() {
  const [status, setStatus] = useState('PENDING_FINAL')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const { data, error, loading } = useAsyncData(
    () => violationService.listLeadershipAppeals({ status, keyword: debouncedKeyword, page, size: PAGE_SIZE }),
    JSON.stringify([status, debouncedKeyword, page]),
  )

  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <div>
          <strong>Khiếu nại mở khóa tài khoản</strong>
          <div className="data-table__note">Xem xét các khiếu nại đã qua sơ duyệt của Biên tập viên. Khi chấp thuận, điểm uy tín được khôi phục về 81.</div>
        </div>
      </div>
      <div className="admin-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={keyword}
            onChange={(event) => { setKeyword(event.target.value); setPage(0) }}
            placeholder="Tìm tên, email hoặc mã tài khoản"
            aria-label="Tìm khiếu nại"
          />
        </label>
      </div>
      <div className="desk-tabs" role="tablist" aria-label="Lọc khiếu nại theo trạng thái">
        {STATUS_TABS.map((tab) => (
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
              <th>Tài khoản</th><th>Khiếu nại</th><th>Biên tập viên sơ duyệt</th><th>Ngày gửi</th><th>Trạng thái</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data && loading && Array.from({ length: 4 }, (_, index) => (
              <tr key={index}><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={6} className="data-table__empty"><Icon name="checkCircle" size={28} />Không có khiếu nại trong mục này.</td></tr>
            )}
            {data?.items.map((item) => {
              const statusTone = item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'purple'
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.account.fullName}</strong>
                    <div className="data-table__note">{item.account.id} · {item.account.email}</div>
                  </td>
                  <td>{item.reason}</td>
                  <td>{item.reviewer?.fullName ?? '—'}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td><Badge tone={statusTone}>{item.status}</Badge></td>
                  <td className="data-table__actions">
                    <Link to={`/leadership/approvals/appeals/${item.id}`} className="desk-open">
                      {item.status === 'PENDING_FINAL' ? 'Duyệt' : 'Chi tiết'}
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

export default LeadershipApprovals
