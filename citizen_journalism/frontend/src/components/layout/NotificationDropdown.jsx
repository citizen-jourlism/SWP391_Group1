
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationService } from '../../services/notificationService'
import '../../assets/styles/notification-dropdown.css'

// Lấy danh sách ID thông báo đã đọc từ localStorage.
function getReadIds(storageKey) {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(data) ? data.map(String) : []
  } catch {
    return []
  }
}

// Lưu danh sách ID thông báo đã đọc.
function saveReadIds(storageKey, ids) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids))
  } catch {
    // Không thể ghi localStorage.
  }
}

// Định dạng thời gian thông báo.
function formatDate(value) {
  if (!value) return ''

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

// Lấy ID của thông báo.
function getNotificationId(item) {
  return String(item.id)
}

// Lấy biểu tượng tương ứng với từng loại thông báo.
function getNotificationIcon(item) {
  switch (item.type) {
    case 'CONTRIBUTOR':
      return '🏅'

    case 'FIELD_WORK':
      return '📝'

    case 'RESEARCH':
      return '📚'

    case 'SUBMISSION':
    default:
      return '📄'
  }
}

export default function NotificationDropdown({
  userId,
}) {
  // Mỗi tài khoản có danh sách thông báo đã đọc riêng.
  const storageKey = `citizen-notifications-read-v1-${userId || 'current'}`

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [readIds, setReadIds] = useState(
    () => getReadIds(storageKey)
  )

  const dropdownRef = useRef(null)

  // Tải thông báo từ backend.
  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await notificationService.getMine()

      const list = Array.isArray(response?.data)
        ? response.data
        : []

      setItems(list)
    } catch (err) {
      setError('Không thể tải thông báo.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cập nhật dữ liệu đã đọc khi đổi tài khoản.
  useEffect(() => {
    setReadIds(getReadIds(storageKey))
    setItems([])
  }, [storageKey])

  // Chỉ tải thông báo khi mở dropdown.
  useEffect(() => {
    if (open) loadNotifications()
  }, [open, loadNotifications])

  // Đóng dropdown khi click bên ngoài hoặc nhấn Escape.
  useEffect(() => {
    if (!open) return

    const handleOutside = event => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    const handleEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  // Đánh dấu một thông báo đã đọc.
  function markAsRead(id) {
    const value = String(id)

    setReadIds(previous => {
      if (previous.includes(value)) return previous

      const updated = [...previous, value]
      saveReadIds(storageKey, updated)

      return updated
    })
  }

  // Đánh dấu tất cả thông báo đã đọc.
  function markAllAsRead() {
    setReadIds(previous => {
      const updated = [
        ...new Set([
          ...previous,
          ...items.map(getNotificationId),
        ]),
      ]

      saveReadIds(storageKey, updated)

      return updated
    })
  }

  // Đếm số thông báo chưa đọc.
  const unreadCount = items.filter(
    item => !readIds.includes(getNotificationId(item))
  ).length

  // Lấy tối đa 5 thông báo mới nhất.
  const recentItems = [...items]
    .sort((a, b) => {
      return new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    })
    .slice(0, 5)

  return (
    <div
      className="notification-dropdown"
      ref={dropdownRef}
    >
      {/* Nút chuông thông báo */}
      <button
        type="button"
        className="notification-dropdown__trigger"
        title="Thông báo"
        aria-label="Mở thông báo"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(value => !value)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-dropdown__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Nội dung dropdown */}
      {open && (
        <div className="notification-dropdown__panel">

          {/* Tiêu đề */}
          <div className="notification-dropdown__header">
            <div>
              <h3>Thông báo</h3>

              <span>
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Không có thông báo chưa đọc'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>

          {/* Đánh dấu tất cả đã đọc */}
          {unreadCount > 0 && (
            <div className="notification-dropdown__toolbar">
              <button
                type="button"
                onClick={markAllAsRead}
              >
                ✓ Đánh dấu tất cả đã đọc
              </button>
            </div>
          )}

          {/* Danh sách thông báo */}
          <div className="notification-dropdown__list">

            {loading && (
              <div className="notification-dropdown__empty">
                Đang tải thông báo...
              </div>
            )}

            {!loading && error && (
              <div
                className="notification-dropdown__empty"
                role="alert"
              >
                {error}

                <button
                  type="button"
                  onClick={loadNotifications}
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Không có thông báo */}
            {!loading && !error && recentItems.length === 0 && (
              <div className="notification-dropdown__empty">
                <span className="notification-dropdown__empty-icon">
                  🔔
                </span>

                <strong>Chưa có thông báo</strong>

                <p>
                  Cập nhật hồ sơ, nhiệm vụ CTV và bài nghiên cứu
                  sẽ xuất hiện tại đây.
                </p>
              </div>
            )}

            {/* Hiển thị thông báo */}
            {!loading && !error && recentItems.map(item => {
              const id = getNotificationId(item)
              const isRead = readIds.includes(id)

              return (
                <div
                  key={id}
                  className={
                    `notification-dropdown__item ${
                      isRead ? 'is-read' : 'is-unread'
                    }`
                  }
                >
                  {/* Biểu tượng theo loại thông báo */}
                  <span className="notification-dropdown__item-icon">
                    {getNotificationIcon(item)}
                  </span>

                  <div className="notification-dropdown__item-content">

                    <div className="notification-dropdown__item-heading">
                      {!isRead && (
                        <span className="notification-dropdown__unread-dot" />
                      )}

                      {item.link ? (
                        <Link
                          to={item.link}
                          className="notification-dropdown__item-title"
                          onClick={() => {
                            markAsRead(id)
                            setOpen(false)
                          }}
                        >
                          {item.title || 'Cập nhật hồ sơ'}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="notification-dropdown__item-title"
                          onClick={() => markAsRead(id)}
                        >
                          {item.title || 'Cập nhật hồ sơ'}
                        </button>
                      )}
                    </div>

                    <p>
                      {item.message || 'Có cập nhật mới.'}
                    </p>

                    <time>
                      {formatDate(item.createdAt)}
                    </time>

                  </div>
                </div>
              )
            })}

          </div>

          {/* Chuyển đến trang thông báo đầy đủ */}
          <Link
            to="/account/notifications"
            className="notification-dropdown__footer"
            onClick={() => setOpen(false)}
          >
            Xem tất cả thông báo
            <span>→</span>
          </Link>

        </div>
      )}
    </div>
  )
}
