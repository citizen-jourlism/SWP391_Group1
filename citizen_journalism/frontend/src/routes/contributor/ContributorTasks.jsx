import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccountLayout from '../../components/layout/AccountLayout'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { assignmentBadge, ASSIGNMENT_STATUS, isOverdue } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE } from '../../lib/submission'
import { contributorTaskService } from '../../services/contributorTaskService'
import '../../assets/styles/assignment.css'
import '../../assets/styles/research.css' // Thẻ lọc .segmented
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)
import '../../assets/styles/tracking.css' // Thẻ danh sách .sub-item, .my-subs

/*
 * NHIỆM VỤ CỦA TÔI — /contributor/tasks, chỉ Cộng tác viên (ProtectedRoute trong App.jsx).
 * Mở từ: menu tài khoản -> "Nhiệm vụ của tôi".
 * Dữ liệu: GET /api/contributor/tasks?status=&page=&size= (mới nhất trước) + GET /api/contributor/tasks/counts.
 * Bấm vào thẻ -> /contributor/tasks/<id> (ContributorTaskDetail) để nhận, từ chối hoặc huỷ.
 */

const PAGE_SIZE = 10
const TABS = [
  { value: '', label: 'Tất cả' },
  ...Object.entries(ASSIGNMENT_STATUS).map(([value, info]) => ({ value, label: info.label })),
]

function ContributorTasks() {
  useDocumentTitle('Nhiệm vụ của tôi')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const { data: counts } = useAsyncData(() => contributorTaskService.counts(), 'task-counts')
  const { data, error, loading } = useAsyncData(
    () => contributorTaskService.list({ status, page, size: PAGE_SIZE }),
    `${status}|${page}`,
  )

  /** Đổi thẻ lọc thì quay về trang đầu. */
  const changeStatus = (value) => {
    setStatus(value)
    setPage(0)
  }

  return (
    <AccountLayout title="Nhiệm vụ của tôi" subtitle="Các nhiệm vụ xác minh hiện trường toà soạn giao cho bạn.">
      <div className="segmented task-tabs" role="group" aria-label="Lọc theo trạng thái">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={status === tab.value ? 'is-active' : ''}
            aria-pressed={status === tab.value}
            onClick={() => changeStatus(tab.value)}
          >
            {tab.label}
            {counts?.[tab.value] > 0 && <span className="segmented__count">{counts[tab.value]}</span>}
          </button>
        ))}
      </div>

      <Alert type="error">{error}</Alert>

      {!data && loading && (
        <div className="my-subs">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton skeleton--card" />
          ))}
        </div>
      )}

      {data?.items.length === 0 && (
        <div className="detail-card my-subs__empty">
          <span className="my-subs__empty-icon">
            <Icon name="mapPin" size={30} />
          </span>
          <h2>Chưa có nhiệm vụ nào</h2>
          <p>Khi toà soạn giao nhiệm vụ xác minh, bạn sẽ nhận được email và thấy nhiệm vụ ở đây.</p>
        </div>
      )}

      {data?.items.length > 0 && (
        <>
          <ul className={`my-subs ${loading ? 'is-loading' : ''}`}>
            {data.items.map((task) => {
              const badge = assignmentBadge(task)
              const category = CATEGORY_BY_VALUE[task.category]
              return (
                <li key={task.id}>
                  <Link to={`/contributor/tasks/${task.id}`} className="sub-item">
                    <span className={`category-card__icon category-card__icon--${category?.slug ?? 'complaint'}`}>
                      <Icon name={category?.icon ?? 'fileText'} size={20} />
                    </span>
                    <span className="sub-item__main">
                      <span className="sub-item__top">
                        <span className="sub-item__code">{task.trackingCode}</span>
                        <span className="sub-item__category">{category?.label}</span>
                      </span>
                      <strong className="sub-item__title">{task.title}</strong>
                      <small>
                        {task.province} · Hạn {formatDateTime(task.deadline)}
                        {isOverdue(task) && <b className="assign-overdue assign-overdue--inline"> · Quá hạn</b>}
                      </small>
                    </span>
                    <span className="sub-item__side">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <span className="sub-item__more">
                        Xem nhiệm vụ
                        <Icon name="chevronDown" size={16} />
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination {...data} onChange={setPage} />
        </>
      )}
    </AccountLayout>
  )
}

export default ContributorTasks
