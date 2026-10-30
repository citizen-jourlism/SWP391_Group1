
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationService } from '../services/notificationService'
import '../assets/styles/notifications.css'

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  IN_REVIEW: 'Đang xem xét',
  NEED_MORE_INFO: 'Cần bổ sung',
  REJECTED: 'Bị từ chối',
  APPROVED: 'Đã phê duyệt',
  PUBLISHED: 'Đã đăng',
  COMPLETED: 'Hoàn tất',
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

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

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

  const counts = useMemo(() => ({
    all: items.length,
    submission: items.filter(
      item => item.type === 'SUBMISSION'
    ).length,
    contributor: items.filter(
      item => item.type === 'CONTRIBUTOR'
    ).length,
  }), [items])

  const visible = items.filter(
    item =>
      filter === 'all'
      || (
        filter === 'submission'
        && item.type === 'SUBMISSION'
      )
      || (
        filter === 'contributor'
        && item.type === 'CONTRIBUTOR'
      )
  )

  return (
    <main className="notifications-page">
      <section className="notifications-hero">
        <div className="notifications-hero__icon">
          🔔
        </div>

        <span className="notifications-hero__eyebrow">
          TIN NÓNG DÂN SINH / TÀI KHOẢN
        </span>

        <h1>Thông báo của tôi</h1>

        <p>
          Theo dõi tiến độ xử lý tin báo, khiếu nại
          và đơn đăng ký cộng tác viên.
        </p>
      </section>

      <section className="notifications-summary">
        <article className="notifications-stat">
          <div>
            <span>Tổng cập nhật</span>
            <strong>{counts.all}</strong>
            <small>Tổng hợp từ dữ liệu hiện có</small>
          </div>

          <span className="notifications-stat__symbol">
            🔔
          </span>
        </article>

        <article className="notifications-stat">
          <div>
            <span>Cập nhật đơn cộng tác viên</span>
            <strong>{counts.contributor}</strong>
            <small>Gồm các bước xét duyệt đã được lưu</small>
          </div>

          <span className="notifications-stat__symbol">
            📋
          </span>
        </article>
      </section>

      <section className="notifications-panel">
        <div className="notifications-panel__header">
          <div>
            <h2>Danh sách thông báo</h2>
            <p>
              Thông tin từ hồ sơ của chính tài khoản
              đang đăng nhập.
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

        <div className="notifications-filters">
          <button
            type="button"
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => setFilter('all')}
          >
            Tất cả ({counts.all})
          </button>

          <button
            type="button"
            className={filter === 'submission' ? 'is-active' : ''}
            onClick={() => setFilter('submission')}
          >
            Hồ sơ tin báo ({counts.submission})
          </button>

          <button
            type="button"
            className={filter === 'contributor' ? 'is-active' : ''}
            onClick={() => setFilter('contributor')}
          >
            Đơn CTV ({counts.contributor})
          </button>
        </div>

        {error && (
          <div className="notifications-error" role="alert">
            <strong>Không thể tải thông báo</strong>
            <p>{error}</p>

            <button type="button" onClick={reload}>
              Thử lại
            </button>
          </div>
        )}

        {loading && (
          <div className="notifications-empty">
            <h3>Đang tải thông báo...</h3>
          </div>
        )}

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
              Thông báo sẽ xuất hiện khi có các bước
              xử lý được ghi nhận trong hệ thống.
            </p>

            <Link to="/account/profile">
              Xem hồ sơ của tôi
            </Link>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="notifications-list">
            {visible.map(item => (
              <article
                className="notification-item"
                key={item.id}
              >
                <div className="notification-item__icon">
                  {item.type === 'CONTRIBUTOR'
                    ? '🏅'
                    : '🔔'}
                </div>

                <div className="notification-item__body">
                  <div className="notification-item__top">
                    <div>
                      <h3>
                        {item.title || 'Hồ sơ được cập nhật'}
                      </h3>

                      <span className="notification-item__time">
                        {formatDate(item.createdAt)}
                        {' · '}
                        {item.type === 'CONTRIBUTOR'
                          ? 'Đăng ký cộng tác viên'
                          : 'Hồ sơ tin báo'}
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
                        : 'Tiến trình đăng ký cộng tác viên'}
                    </span>

                    {item.link && (
                      <Link
                        className="notification-item__link"
                        to={item.link}
                      >
                        {item.type === 'CONTRIBUTOR'
                          ? 'Xem tiến trình CTV →'
                          : 'Xem hồ sơ →'}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="notifications-footer">
        <span>
          Đây là lịch sử cập nhật, không phải
          thông báo đẩy thời gian thực.
        </span>

        <Link to="/">
          ← Về trang chủ
        </Link>
      </div>
    </main>
  )
}
