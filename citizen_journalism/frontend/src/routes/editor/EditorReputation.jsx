import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { editorService } from '../../services/editorService'

const PAGE_SIZE = 10
const ROLES = ['CITIZEN', 'EXPERT']

function EditorReputation() {
  const [role, setRole] = useState('CITIZEN')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const { data, error, loading } = useAsyncData(
    () => editorService.listReputationAccounts({ role, keyword: debouncedKeyword, page, size: PAGE_SIZE }),
    JSON.stringify([role, debouncedKeyword, page]),
  )

  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <div>
          <strong>Uy tín và xử phạt</strong>
          <div className="data-table__note">Chọn Citizen hoặc Expert để xem các bài viết, đánh giá từng bài và cập nhật điểm uy tín.</div>
        </div>
      </div>
      <div className="desk-tabs" role="tablist" aria-label="Lọc theo vai trò">
        {ROLES.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={role === value}
            className={role === value ? 'is-active' : ''}
            onClick={() => { setRole(value); setPage(0) }}
          >
            {ROLE_LABELS[value]}
          </button>
        ))}
      </div>
      <div className="admin-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={keyword}
            onChange={(event) => { setKeyword(event.target.value); setPage(0) }}
            placeholder="Tìm mã tài khoản, tên hoặc email"
            aria-label="Tìm tài khoản"
          />
        </label>
        {data && <span className="desk-toolbar__count">{data.totalItems} tài khoản</span>}
      </div>
      <Alert type="error">{error}</Alert>
      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr><th>Mã tài khoản</th><th>Họ tên / email</th><th>Điểm uy tín</th><th>Trạng thái</th><th /></tr>
          </thead>
          <tbody>
            {!data && loading && Array.from({ length: 4 }, (_, index) => (
              <tr key={index}><td colSpan={5}><div className="skeleton skeleton--row" /></td></tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={5} className="data-table__empty"><Icon name="users" size={28} />Không tìm thấy tài khoản.</td></tr>
            )}
            {data?.items.map((account) => (
              <tr key={account.id}>
                <td className="data-table__mono"><strong>{account.id}</strong></td>
                <td><strong>{account.fullName}</strong><div className="data-table__note">{account.email}</div></td>
                <td><Badge tone={(account.reputationScore ?? 0) < 80 ? 'red' : 'green'}>{account.reputationScore ?? 0} / 100</Badge></td>
                <td><Badge tone={STATUS_INFO[account.status]?.tone}>{STATUS_INFO[account.status]?.label ?? account.status}</Badge></td>
                <td className="data-table__actions">
                  <Link to={`/editor/reputation/accounts/${encodeURIComponent(account.id)}`} className="desk-open">
                    Xem bài viết<Icon name="chevronDown" size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination {...data} onChange={setPage} />}
    </section>
  )
}

export default EditorReputation
