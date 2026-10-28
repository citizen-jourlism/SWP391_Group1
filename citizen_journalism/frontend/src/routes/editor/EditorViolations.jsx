import { useState } from 'react'
import { Link } from 'react-router-dom'
import CreateViolationDialog from '../../components/editor/CreateViolationDialog'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import Avatar from '../../components/ui/Avatar'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { VIOLATION_SEVERITIES, VIOLATION_STATUSES, VIOLATION_TYPES, VIOLATION_TYPE_OPTIONS } from '../../lib/violations'
import { ROLE_LABELS } from '../../lib/roles'
import { formatDateTime } from '../../lib/format'
import { violationService } from '../../services/violationService'

const PAGE_SIZE = 10
const TABS = [
  { value: 'PENDING_REVIEW', label: 'Chờ xem xét' },
  { value: 'PENDING_APPROVAL', label: 'Chờ lãnh đạo duyệt' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'DISMISSED', label: 'Đã bỏ qua' },
  { value: 'REJECTED', label: 'Bị admin từ chối' },
  { value: '', label: 'Tất cả' },
]

function EditorViolations() {
  const [status, setStatus] = useState('PENDING_REVIEW')
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const { data, error, loading, reload } = useAsyncData(
    () => violationService.listForEditor({ status, type, keyword: debouncedKeyword, page, size: PAGE_SIZE }),
    JSON.stringify([status, type, debouncedKeyword, page]),
  )

  return (
    <>
      <section className="admin-panel">
        <div className="admin-toolbar">
          <label className="search-box">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(0)
              }}
              placeholder="Tìm theo tên, email hoặc mã tài khoản"
              aria-label="Tìm tài khoản trong báo cáo vi phạm"
            />
          </label>
          <SelectField
            aria-label="Lọc theo loại vi phạm"
            options={VIOLATION_TYPE_OPTIONS}
            placeholder="Tất cả loại vi phạm"
            value={type}
            onChange={(event) => { setType(event.target.value); setPage(0) }}
          />
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            Lập báo cáo
          </Button>
        </div>

        <div className="desk-tabs" role="tablist" aria-label="Lọc báo cáo theo trạng thái">
          {TABS.map((tab) => (
            <button
              key={tab.value || 'ALL'}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={status === tab.value ? 'is-active' : ''}
              onClick={() => {
                setStatus(tab.value)
                setPage(0)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Alert type="success">{notice}</Alert>
        <Alert type="error">{error}</Alert>

        <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Vi phạm</th>
                <th>Mức độ</th>
                <th>Nội dung liên quan</th>
                <th>Ngày lập</th>
                <th>Trạng thái</th>
                <th className="data-table__actions" aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {!data && loading && Array.from({ length: 4 }, (_, index) => (
                <tr key={index}><td colSpan={7}><div className="skeleton skeleton--row" /></td></tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={7} className="data-table__empty"><Icon name="checkCircle" size={28} />Không có báo cáo trong mục này.</td></tr>
              )}
              {data?.items.map((item) => {
                const statusInfo = VIOLATION_STATUSES[item.status]
                const severity = VIOLATION_SEVERITIES[item.severity]
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="applicant__head">
                        <Avatar name={item.userName} src={item.avatarUrl} size={34} />
                        <span><strong>{item.userName}</strong><span className="data-table__note">{ROLE_LABELS[item.userRole] ?? item.userRole} · {item.userEmail}</span></span>
                      </div>
                      <div className="data-table__note">{item.userId} · Uy tín {item.reputationScore ?? 0}</div>
                    </td>
                    <td>{VIOLATION_TYPES[item.type] ?? item.type}</td>
                    <td><Badge tone={severity?.tone}>{severity?.label ?? item.severity}</Badge></td>
                    <td>{item.trackingCode ? <><strong>{item.trackingCode}</strong><div className="data-table__note">{item.submissionTitle ?? 'Chưa có tiêu đề'}</div></> : '—'}</td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td><Badge tone={statusInfo?.tone}>{statusInfo?.label ?? item.status}</Badge></td>
                    <td className="data-table__actions">
                      <Link to={`/editor/members/${item.id}`} className="desk-open">
                        {item.status === 'PENDING_REVIEW' ? 'Xem xét' : 'Chi tiết'}
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

      <CreateViolationDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(_violation, message) => {
          setNotice(message)
          setStatus('PENDING_REVIEW')
          setPage(0)
          reload()
        }}
      />
    </>
  )
}

export default EditorViolations