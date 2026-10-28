import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime } from '../../lib/format'
import { VIOLATION_ACTIONS, VIOLATION_SEVERITIES, VIOLATION_STATUSES, VIOLATION_TYPES } from '../../lib/violations'
import { violationService } from '../../services/violationService'

const PAGE_SIZE = 10
const VIOLATION_STATUS_TABS = [
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'RESOLVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: '', label: 'Tất cả' },
]
const APPEAL_STATUS_TABS = [
  { value: 'PENDING_FINAL', label: 'Chờ phê duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: '', label: 'Tất cả' },
]

function LeadershipApprovals({ initialKind = 'violations' }) {
  const isAppeal = initialKind === 'appeals'
  const [kind, setKind] = useState('violations')
  const [violationStatus, setViolationStatus] = useState('PENDING_APPROVAL')
  const [appealStatus, setAppealStatus] = useState('PENDING_FINAL')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const status = isAppeal ? appealStatus : violationStatus
  const load = () => isAppeal
    ? violationService.listLeadershipAppeals({ status, keyword: debouncedKeyword, page, size: PAGE_SIZE })
    : violationService.listApprovals({
      status,
      action: kind === 'retractions' ? 'RETRACT_CONTENT' : undefined,
      keyword: debouncedKeyword,
      page,
      size: PAGE_SIZE,
    })
  const { data, error, loading } = useAsyncData(load, JSON.stringify([kind, status, debouncedKeyword, page]))

  const changeKind = (value) => {
    setKind(value)
    setViolationStatus('PENDING_APPROVAL')
    setPage(0)
  }

  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <div>
          <strong>{isAppeal ? 'Khiếu nại mở khóa tài khoản' : 'Quy trình xét duyệt vi phạm và gỡ bài'}</strong>
          <div className="data-table__note">{isAppeal
            ? 'Xem xét các khiếu nại đã qua sơ duyệt của Biên tập viên.'
            : 'Xem xét các đề xuất xử lý vi phạm hoặc gỡ nội dung cần lãnh đạo phê duyệt.'}</div>
        </div>
      </div>
      {!isAppeal && <div className="desk-tabs" role="tablist" aria-label="Loại hồ sơ phê duyệt">
        <button type="button" role="tab" aria-selected={kind === 'violations'} className={kind === 'violations' ? 'is-active' : ''} onClick={() => changeKind('violations')}>Xử lý vi phạm</button>
        <button type="button" role="tab" aria-selected={kind === 'retractions'} className={kind === 'retractions' ? 'is-active' : ''} onClick={() => changeKind('retractions')}>Rút / gỡ bài</button>
      </div>}
      <div className="admin-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input type="search" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(0) }} placeholder="Tìm tên, email hoặc mã tài khoản" aria-label="Tìm hồ sơ" />
        </label>
      </div>
      <div className="desk-tabs" role="tablist" aria-label="Lọc hồ sơ theo trạng thái">
        {(isAppeal ? APPEAL_STATUS_TABS : VIOLATION_STATUS_TABS).map((tab) => (
          <button key={tab.value || 'ALL'} type="button" role="tab" aria-selected={status === tab.value} className={status === tab.value ? 'is-active' : ''} onClick={() => { (isAppeal ? setAppealStatus : setViolationStatus)(tab.value); setPage(0) }}>{tab.label}</button>
        ))}
      </div>
      <Alert type="error">{error}</Alert>
      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead><tr>
            <th>Tài khoản</th><th>{isAppeal ? 'Khiếu nại' : kind === 'retractions' ? 'Nội dung gỡ' : 'Báo cáo'}</th>
            <th>{isAppeal ? 'Biên tập viên sơ duyệt' : 'Biện pháp'}</th><th>Ngày gửi</th><th>Trạng thái</th><th className="data-table__actions" aria-label="Thao tác" />
          </tr></thead>
          <tbody>
            {!data && loading && Array.from({ length: 4 }, (_, index) => <tr key={index}><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr>)}
            {data?.items.length === 0 && <tr><td colSpan={6} className="data-table__empty"><Icon name="checkCircle" size={28} />Không có hồ sơ trong mục này.</td></tr>}
            {data?.items.map((item) => {
              const statusInfo = !isAppeal ? VIOLATION_STATUSES[item.status] : null
              const pending = isAppeal ? item.status === 'PENDING_FINAL' : item.status === 'PENDING_APPROVAL'
              const account = isAppeal ? { name: item.account.fullName, id: item.account.id, email: item.account.email } : { name: item.userName, id: item.userId, email: item.userEmail }
              return (
                <tr key={item.id}>
                  <td><strong>{account.name}</strong><div className="data-table__note">{account.id} · {account.email}</div></td>
                  <td>{!isAppeal ? <>{kind === 'retractions' ? item.submissionTitle ?? item.trackingCode ?? 'Nội dung liên quan' : VIOLATION_TYPES[item.type] ?? item.type}{item.severity && <div className="data-table__note"><Badge tone={VIOLATION_SEVERITIES[item.severity]?.tone}>{VIOLATION_SEVERITIES[item.severity]?.label ?? item.severity}</Badge></div>}</> : item.reason}</td>
                  <td>{!isAppeal ? (VIOLATION_ACTIONS[item.proposedAction] ?? item.proposedAction ?? '—') : (item.reviewer?.fullName ?? '—')}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td><Badge tone={statusInfo?.tone ?? (item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'purple')}>{statusInfo?.label ?? item.status}</Badge></td>
                  <td className="data-table__actions">
                    <Link to={`/leadership/approvals/${isAppeal ? 'appeals' : 'violations'}/${item.id}`} className="desk-open">{pending ? 'Xem xét' : 'Chi tiết'}<Icon name="chevronDown" size={14} /></Link>
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
