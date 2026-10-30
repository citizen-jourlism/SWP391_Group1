import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { assignmentBadge, ASSIGNMENT_STATUS, isOverdue } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'
import '../../assets/styles/assignment.css'

/*
 * DANH SÁCH NHIỆM VỤ XÁC MINH — /editor/assignments (menu "Giao nhiệm vụ").
 * Dữ liệu: GET /api/editor/assignments?status=&page=&size= (FieldAssignmentController), mới nhất trước.
 * Việc GIAO diễn ra ở từng hồ sơ: hàng đợi -> mở hồ sơ -> "Giao CTV xác minh" (EditorAssignContributor).
 * Nút "Mở" quay về hồ sơ, nơi hiện chi tiết nhiệm vụ.
 */

const PAGE_SIZE = 10
const STATUS_OPTIONS = Object.entries(ASSIGNMENT_STATUS).map(([value, info]) => ({ value, label: info.label }))

function EditorAssignments() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const { data, error, loading } = useAsyncData(
    () => editorService.listAssignments({ status, page, size: PAGE_SIZE }),
    `${status}|${page}`,
  )

  return (
    <section className="admin-panel">
      <div className="desk-toolbar">
        <SelectField
          options={STATUS_OPTIONS}
          placeholder="Tất cả trạng thái"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(0) // Đổi bộ lọc thì quay về trang đầu
          }}
          aria-label="Lọc theo trạng thái"
        />
        {data && <span className="desk-toolbar__count">{data.totalItems} nhiệm vụ</span>}
      </div>

      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Hồ sơ</th>
              <th>Khu vực</th>
              <th>Cộng tác viên</th>
              <th>Hạn hoàn thành</th>
              <th>Trạng thái</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={6}>
                    <div className="skeleton skeleton--row" />
                  </td>
                </tr>
              ))}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="data-table__empty">
                  <Icon name="mapPin" size={28} />
                  Chưa có nhiệm vụ nào. Mở một hồ sơ trong hàng đợi để giao cho Cộng tác viên.
                </td>
              </tr>
            )}

            {data?.items.map((item) => {
              const badge = assignmentBadge(item)
              return (
                <tr key={item.id}>
                  <td>
                    <div className="desk-cell">
                      <span>
                        <strong>{item.submissionTitle}</strong>
                        <small>{item.trackingCode}</small>
                      </span>
                    </div>
                  </td>
                  <td>{item.province}</td>
                  <td>
                    <span className="assign-person">
                      <Avatar name={item.contributorName} src={item.contributorAvatarUrl} size={30} />
                      {item.contributorName}
                    </span>
                  </td>
                  <td>
                    {formatDateTime(item.deadline)}
                    {isOverdue(item) && <small className="assign-overdue">Quá hạn</small>}
                  </td>
                  <td>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </td>
                  <td className="data-table__actions">
                    <Link to={`/editor/queue/${item.trackingCode}`} className="desk-open">
                      Mở
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

export default EditorAssignments
