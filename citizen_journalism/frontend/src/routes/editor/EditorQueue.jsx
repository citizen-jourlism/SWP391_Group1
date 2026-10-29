import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE, REPORT_CATEGORIES, SUBMISSION_STATUS } from '../../lib/submission'
import { editorService } from '../../services/editorService'
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)

/*
 * HÀNG ĐỢI TIN BÀI — /editor/queue.
 * Dữ liệu THẬT: GET /api/editor/submissions?status=&category=&page= (mặc định: hồ sơ chờ tiếp nhận, cũ nhất trước).
 * Hiện mới XEM được; bấm 1 dòng -> /editor/queue/<mã> (EditorSubmissionDetail) có các nút xử lý dự kiến.
 * Hiện mã tài khoản người gửi; hồ sơ ẩn danh không tiết lộ mã tài khoản.
 */

const PAGE_SIZE = 10
const STATUS_OPTIONS = Object.entries(SUBMISSION_STATUS).map(([value, info]) => ({ value, label: info.label }))
const CATEGORY_OPTIONS = REPORT_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))

function EditorQueue() {
  const [status, setStatus] = useState('PENDING')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(0)
  const { data, error, loading } = useAsyncData(
    () => editorService.listSubmissions({ status, category, page, size: PAGE_SIZE }),
    `${status}|${category}|${page}`,
  )

  /** Đổi bộ lọc thì quay về trang đầu. */
  const changeFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  return (
    <section className="admin-panel">
      <div className="desk-toolbar">
        <SelectField options={STATUS_OPTIONS} placeholder="Tất cả trạng thái" value={status} onChange={changeFilter(setStatus)} aria-label="Lọc theo trạng thái" />
        <SelectField options={CATEGORY_OPTIONS} placeholder="Tất cả loại" value={category} onChange={changeFilter(setCategory)} aria-label="Lọc theo loại" />
        {data && <span className="desk-toolbar__count">{data.totalItems} hồ sơ</span>}
      </div>

      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Hồ sơ</th>
              <th>Mã</th>
              <th>Mã tài khoản người gửi</th>
              <th>Khu vực</th>
              <th>Gửi lúc</th>
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
                  Không có hồ sơ nào phù hợp.
                </td>
              </tr>
            )}

            {data?.items.map((item) => {
              const categoryInfo = CATEGORY_BY_VALUE[item.category]
              const statusInfo = SUBMISSION_STATUS[item.status]
              return (
                <tr key={item.trackingCode}>
                  <td>
                    <div className="desk-cell">
                      <span className={`category-card__icon category-card__icon--${categoryInfo?.slug ?? 'complaint'}`}>
                        <Icon name={categoryInfo?.icon ?? 'fileText'} size={16} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {categoryInfo?.label}
                          {item.anonymous && ' · Ẩn danh'}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="data-table__mono">{item.trackingCode}</td>
                  <td className="data-table__mono">
                    {item.anonymous ? 'Ẩn danh' : item.senderAccountId}
                  </td>
                  <td>{item.province}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <Badge tone={statusInfo?.tone}>{statusInfo?.label ?? item.status}</Badge>
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

export default EditorQueue
