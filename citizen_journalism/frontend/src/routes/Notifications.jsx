
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from '../components/layout/SiteHeader'
import { notificationService } from '../services/notificationService'
import '../assets/styles/notifications.css'

const PAGE_SIZE = 10

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  IN_REVIEW: 'Đang xem xét',
  NEED_MORE_INFO: 'Cần bổ sung',
  REJECTED: 'Bị từ chối',
  APPROVED: 'Đã phê duyệt',
  PUBLISHED: 'Đã đăng',
  COMPLETED: 'Hoàn tất',
  SUBMITTED: 'Đã nộp',
  PENDING_EDITOR: 'Chờ Biên tập viên',
  PENDING_DEPUTY: 'Chờ Phó TBT',
  WITHDRAWN: 'Đã rút đơn',
  CANCELLED: 'Đã hủy',
  DEPUTY_PENDING: 'Chờ Phó TBT',
  DEPUTY_REJECTED: 'Phó TBT từ chối',
  EIC_PENDING: 'Chờ Tổng biên tập',
  EIC_REJECTED: 'Tổng biên tập từ chối',
  READY_FOR_PUBLISHING: 'Sẵn sàng đăng',
  CORRECTED: 'Đã đính chính',
  RETRACTED: 'Đã gỡ bài',
  ACCEPTED: 'Đã đồng ý',
}

const TYPE_LABELS = {
  SUBMISSION: 'Hồ sơ tin báo',
  CONTRIBUTOR: 'Đơn CTV',
  FIELD_WORK: 'Nhiệm vụ CTV',
  RESEARCH: 'Bài nghiên cứu',
}

const TYPE_ICONS = {
  SUBMISSION: '📄',
  CONTRIBUTOR: '🏅',
  FIELD_WORK: '📝',
  RESEARCH: '📚',
}

function formatDate(value) {
  if (!value) return 'Không rõ thời gian'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ')
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getLinkLabel(item) {
  if (item.type === 'CONTRIBUTOR') return 'Xem tiến trình CTV →'

  if (item.type === 'FIELD_WORK') {
    return 'Mở nhiệm vụ →'
  }

  if (item.type === 'RESEARCH') {
    if (item.link?.startsWith('/editor/')) return 'Mở bài cần xử lý →'
    if (item.link?.startsWith('/leadership/')) return 'Mở bài chờ duyệt →'
    if (item.link?.startsWith('/research/revisions/')) {
      return 'Xem yêu cầu chỉnh sửa →'
    }
    return 'Xem bài nghiên cứu →'
  }

  return 'Xem hồ sơ →'
}

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  // Trang hiện tại.
  const [currentPage, setCurrentPage] = useState(1)

  // Tải danh sách thông báo.
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await notificationService.getMine()

      setItems(
        Array.isArray(response.data)
          ? response.data
          : []
      )
    } catch (err) {
      setError(err.message || 'Không thể tải thông báo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Đếm số lượng thông báo theo loại.
  const counts = useMemo(() => ({
    all: items.length,

    submission: items.filter(
      item => item.type === 'SUBMISSION'
    ).length,

    contributor: items.filter(
      item => item.type === 'CONTRIBUTOR'
    ).length,

    field: items.filter(
      item => item.type === 'FIELD_WORK'
    ).length,

    research: items.filter(
      item => item.type === 'RESEARCH'
    ).length,

    writing: items.filter(
      item =>
        item.type === 'FIELD_WORK'
        || item.type === 'RESEARCH'
    ).length,
  }), [items])

  // Lọc thông báo theo nhóm.
  const visible = useMemo(() => {
    return items.filter(item => {
      if (filter === 'all') return true
      if (filter === 'submission') return item.type === 'SUBMISSION'
      if (filter === 'contributor') return item.type === 'CONTRIBUTOR'
      if (filter === 'field') return item.type === 'FIELD_WORK'
      if (filter === 'research') return item.type === 'RESEARCH'

      return true
    })
  }, [items, filter])

  // Tổng số trang.
  const totalPages = Math.max(
    1,
    Math.ceil(visible.length / PAGE_SIZE)
  )

  // Nếu số lượng thông báo giảm khiến trang hiện tại không còn tồn tại,
  // tự động chuyển về trang hợp lệ cuối cùng.
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages))
  }, [totalPages])

  // Tính vị trí bắt đầu và kết thúc của trang.
  const startIndex = (currentPage - 1) * PAGE_SIZE

  const endIndex = Math.min(
    startIndex + PAGE_SIZE,
    visible.length
  )

  // Danh sách thông báo của trang hiện tại.
  const paginatedItems = visible.slice(
    startIndex,
    startIndex + PAGE_SIZE
  )

  // Danh sách số trang.
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  )

  // Chuyển bộ lọc và quay về trang đầu tiên.
  function changeFilter(nextFilter) {
    setFilter(nextFilter)
    setCurrentPage(1)
  }

  // Chuyển trang.
  function changePage(page) {
    if (page < 1 || page > totalPages) return

    setCurrentPage(page)

    // Đưa người dùng về đầu danh sách thông báo.
    document.querySelector('.notifications-panel')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }

  return (
    <>
      <SiteHeader />

      <main className="notifications-page">

        {/* Nút về trang chủ */}
        <div className="notifications-topbar">
          <Link to="/" className="notifications-home-link">
            <span>←</span>
            Về trang chủ
          </Link>
        </div>

        {/* Tiêu đề */}
        <section className="notifications-hero">
          <div className="notifications-hero__icon">
            🔔
          </div>

          <span className="notifications-hero__eyebrow">
            TIN NÓNG DÂN SINH / TÀI KHOẢN
          </span>

          <h1>Thông báo của tôi</h1>

          <p>
            Theo dõi tiến độ xử lý hồ sơ, nhiệm vụ cộng tác viên
            và các bài nghiên cứu trong quá trình biên tập.
          </p>
        </section>

        {/* Thống kê */}
        <section className="notifications-summary">
          <article className="notifications-stat">
            <div>
              <span>Tổng cập nhật</span>
              <strong>{counts.all}</strong>
              <small>Tất cả thông báo của tài khoản</small>
            </div>

            <span className="notifications-stat__symbol">
              🔔
            </span>
          </article>

          <article className="notifications-stat">
            <div>
              <span>Cập nhật viết bài và xác minh</span>
              <strong>{counts.writing}</strong>
              <small>
                {counts.field} nhiệm vụ CTV · {counts.research} bài nghiên cứu
              </small>
            </div>

            <span className="notifications-stat__symbol">
              📝
            </span>
          </article>
        </section>

        {/* Danh sách thông báo */}
        <section className="notifications-panel">

          <div className="notifications-panel__header">
            <div>
              <h2>Danh sách thông báo</h2>
              <p>
                Chỉ hiển thị cập nhật thuộc tài khoản đang đăng nhập
                và các nhiệm vụ được giao cho tài khoản đó.
              </p>
            </div>

            <button
              className="notifications-refresh"
              onClick={reload}
              disabled={loading}
              type="button"
            >
              ↻ {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>

          {/* Bộ lọc */}
          <div className="notifications-filters">
            <button
              type="button"
              className={filter === 'all' ? 'is-active' : ''}
              onClick={() => changeFilter('all')}
            >
              Tất cả ({counts.all})
            </button>

            <button
              type="button"
              className={filter === 'submission' ? 'is-active' : ''}
              onClick={() => changeFilter('submission')}
            >
              Hồ sơ tin báo ({counts.submission})
            </button>

            <button
              type="button"
              className={filter === 'contributor' ? 'is-active' : ''}
              onClick={() => changeFilter('contributor')}
            >
              Đơn CTV ({counts.contributor})
            </button>

            <button
              type="button"
              className={filter === 'field' ? 'is-active' : ''}
              onClick={() => changeFilter('field')}
            >
              Nhiệm vụ CTV ({counts.field})
            </button>

            <button
              type="button"
              className={filter === 'research' ? 'is-active' : ''}
              onClick={() => changeFilter('research')}
            >
              Bài nghiên cứu ({counts.research})
            </button>
          </div>

          {/* Lỗi tải dữ liệu */}
          {error && (
            <div className="notifications-error" role="alert">
              <strong>Không thể tải thông báo</strong>
              <p>{error}</p>

              <button type="button" onClick={reload}>
                Thử lại
              </button>
            </div>
          )}

          {/* Đang tải */}
          {loading && (
            <div className="notifications-empty">
              <h3>Đang tải thông báo...</h3>
            </div>
          )}

          {/* Không có thông báo */}
          {!loading && !error && visible.length === 0 && (
            <div className="notifications-empty">
              <div className="notifications-empty__icon">
                🔔
              </div>

              <h3>
                {filter === 'all'
                  ? 'Bạn chưa có cập nhật nào'
                  : 'Không có cập nhật thuộc nhóm này'}
              </h3>

              <p>
                Thông báo sẽ xuất hiện khi có hồ sơ được xử lý,
                nhiệm vụ được giao hoặc bài viết có cập nhật mới.
              </p>

              <Link to="/account/profile">
                Xem hồ sơ của tôi
              </Link>
            </div>
          )}

          {/* Danh sách thông báo của trang hiện tại */}
          {!loading && !error && visible.length > 0 && (
            <>
              <div className="notifications-list">
                {paginatedItems.map(item => (
                  <article
                    className="notification-item"
                    key={item.id}
                  >
                    <div className="notification-item__icon">
                      {TYPE_ICONS[item.type] || '🔔'}
                    </div>

                    <div className="notification-item__body">
                      <div className="notification-item__top">
                        <div>
                          <h3>
                            {item.title || 'Thông tin được cập nhật'}
                          </h3>

                          <span className="notification-item__time">
                            {formatDate(item.createdAt)}
                            {' · '}
                            {TYPE_LABELS[item.type] || 'Thông báo hệ thống'}
                          </span>
                        </div>

                        <span className="notification-item__status">
                          {STATUS_LABELS[item.status]
                            || item.status
                            || 'Đã cập nhật'}
                        </span>
                      </div>

                      <p className="notification-item__message">
                        {item.message}
                      </p>

                      {item.note && (
                        <div className="notification-item__note">
                          <strong>Ghi chú:</strong>
                          <p>{item.note}</p>
                        </div>
                      )}

                      <div className="notification-item__footer">
                        <span>
                          {item.trackingCode
                            ? `Mã hồ sơ: ${item.trackingCode}`
                            : TYPE_LABELS[item.type] || 'Tiến trình tài khoản'}
                        </span>

                        {item.link && (
                          <Link
                            className="notification-item__link"
                            to={item.link}
                          >
                            {getLinkLabel(item)}
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* PHÂN TRANG */}
              <div className="notifications-pagination">

                <div className="notifications-pagination__info">
                  Hiển thị <strong>{startIndex + 1}</strong>
                  {' - '}
                  <strong>{endIndex}</strong>
                  {' trong '}
                  <strong>{visible.length}</strong>
                  {' thông báo'}
                </div>

                <div className="notifications-pagination__controls">

                  <button
                    type="button"
                    className="notifications-pagination__button"
                    disabled={currentPage === 1}
                    onClick={() => changePage(currentPage - 1)}
                  >
                    ← Trước
                  </button>

                  {pageNumbers.map(page => (
                    <button
                      key={page}
                      type="button"
                      className={
                        `notifications-pagination__button ${
                          currentPage === page ? 'is-active' : ''
                        }`
                      }
                      aria-current={
                        currentPage === page ? 'page' : undefined
                      }
                      onClick={() => changePage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="notifications-pagination__button"
                    disabled={currentPage === totalPages}
                    onClick={() => changePage(currentPage + 1)}
                  >
                    Sau →
                  </button>

                </div>
              </div>
            </>
          )}
        </section>

        <div className="notifications-footer">
          <span>
            Đây là lịch sử cập nhật được tổng hợp từ dữ liệu nghiệp vụ,
            không phải thông báo đẩy thời gian thực.
          </span>
        </div>

      </main>
    </>
  )
}
