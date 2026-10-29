import { useState } from 'react'
import { Link } from 'react-router-dom'
import UserCell from '../../components/admin/UserCell'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { APPLICATION_STATUS } from '../../lib/contributor'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'
import '../../assets/styles/contributor.css' // Hàng nhãn lĩnh vực (.app-facts__tags)

/*
 * DANH SÁCH ĐƠN ĐĂNG KÝ CỘNG TÁC VIÊN — /editor/applications.
 * Dữ liệu: GET /api/editor/applications?status=&page=. Bấm 1 đơn -> /editor/applications/:id để xét duyệt.
 *
 * Các thẻ lọc theo trạng thái. Mặc định "Chờ xét" (đơn nộp trước hiện trước, để xét theo thứ tự).
 */

const PAGE_SIZE = 10
const TABS = [
  { value: 'PENDING_EDITOR', label: 'Chờ xét' },
  { value: 'PENDING_DEPUTY', label: 'Đã chuyển Phó TBT' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: '', label: 'Tất cả' },
]

function EditorApplications() {
  const [status, setStatus] = useState('PENDING_EDITOR')
  const [page, setPage] = useState(0)
  const { data, error, loading } = useAsyncData(
    () => editorService.listApplications({ status, page, size: PAGE_SIZE }),
    `${status}|${page}`,
  )

  return (
    <section className="admin-panel">
      {/* Thẻ lọc dạng "segmented control"; role="tablist" để trình đọc màn hình hiểu đây là nhóm thẻ */}
      <div className="desk-tabs" role="tablist" aria-label="Lọc đơn theo trạng thái">
        {TABS.map((tab) => (
          <button
            key={tab.label}
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

      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Người đăng ký</th>
              <th>Lĩnh vực</th>
              <th>Khu vực</th>
              <th>Uy tín</th>
              <th>Ngày nộp</th>
              <th>Trạng thái</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={7}>
                    <div className="skeleton skeleton--row" />
                  </td>
                </tr>
              ))}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="data-table__empty">
                  <Icon name="checkCircle" size={28} />
                  Không có đơn nào trong mục này.
                </td>
              </tr>
            )}

            {data?.items.map((item) => {
              const statusInfo = APPLICATION_STATUS[item.status]
              return (
                <tr key={item.id}>
                  <td>
                    {/* UserCell nhận object có fullName / email / avatarUrl */}
                    <UserCell
                      user={{ fullName: item.applicantName, email: item.applicantEmail, avatarUrl: item.avatarUrl }}
                      sub={`${item.applicantId} · ${item.applicantEmail}`}
                    />
                  </td>
                  <td>
                    <div className="app-facts__tags">
                      {item.expertiseFields.map((field) => (
                        <span key={field} className="tag">
                          {field}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{item.province}</td>
                  <td>
                    <strong>{item.reputationScore ?? 0}</strong>
                  </td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <Badge tone={statusInfo?.tone}>{statusInfo?.label ?? item.status}</Badge>
                  </td>
                  <td className="data-table__actions">
                    <Link to={`/editor/applications/${item.id}`} className="desk-open">
                      {item.status === 'PENDING_EDITOR' ? 'Xét duyệt' : 'Xem'}
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

export default EditorApplications
