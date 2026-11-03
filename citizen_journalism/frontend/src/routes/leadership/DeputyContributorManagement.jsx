
import { useState } from 'react'
import Alert from '../../components/ui/Alert'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { deputyContributorManagementService } from '../../services/deputyContributorManagementService'
import '../../assets/styles/deputy-contributor-management.css'

// TungTT - Iteration 3 - Task 2
// Chỉ quản lý giao diện và dữ liệu CTV hiện có.

const PAGE_SIZE = 10

function getStatus(status) {
  switch (status) {
    case 'ACTIVE':
      return { text: 'Đang hoạt động', type: 'active' }
    case 'LOCKED':
    case 'SUSPENDED':
      return { text: 'Tạm khóa', type: 'locked' }
    case 'PENDING_OTP':
      return { text: 'Chưa xác thực', type: 'pending' }
    default:
      return { text: status || 'Chưa xác định', type: 'other' }
  }
}

// Thẻ thống kê của trang.
function StatCard({ icon, label, value, color }) {
  return (
    <div className="dcm-stat">
      <div className={`dcm-stat__icon dcm-stat__icon--${color}`}>
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

// Thông tin chi tiết của một CTV.
function InfoItem({ label, value }) {
  return (
    <div className="dcm-info">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  )
}

function DeputyContributorManagement() {
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  // Lấy danh sách CTV từ API.
  const { data, error, loading, reload } = useAsyncData(
    () => deputyContributorManagementService.list({
      keyword: search,
      page,
      size: PAGE_SIZE,
    }),
    `${search}|${page}`
  )

  // Lấy thông tin người đang được chọn.
  const {
    data: detail,
    error: detailError,
    loading: detailLoading,
  } = useAsyncData(
    () => selectedId
      ? deputyContributorManagementService.get(selectedId)
      : Promise.resolve({ data: null }),
    selectedId || ''
  )

  const items = data?.items ?? data?.content ?? []
  const totalItems = data?.totalItems ?? data?.totalElements ?? null

  const totalPages = data?.totalPages ??
    (totalItems === null ? null : Math.ceil(totalItems / PAGE_SIZE))

  const hasNext = totalPages !== null
    ? page + 1 < totalPages
    : items.length === PAGE_SIZE

  // Các thống kê trạng thái chỉ tính trên trang hiện tại.
  const activeCount = items.filter(x => x.status === 'ACTIVE').length
  const otherCount = items.length - activeCount

  const handleSearch = (event) => {
    event.preventDefault()
    setSearch(keyword.trim())
    setPage(0)
    setSelectedId(null)
  }

  const clearSearch = () => {
    setKeyword('')
    setSearch('')
    setPage(0)
    setSelectedId(null)
  }

  const changePage = (newPage) => {
    if (newPage < 0 || (totalPages !== null && newPage >= totalPages)) {
      return
    }
    setPage(newPage)
    setSelectedId(null)
  }

  return (
    <div className="dcm-page">
      {/* Tiêu đề */}
      <header className="dcm-hero">
        <div>
          <span className="dcm-hero__eyebrow">EDITORIAL MANAGEMENT</span>
          <h1>Quản lý Cộng tác viên</h1>
          <p>Theo dõi và tra cứu thông tin đội ngũ Cộng tác viên.</p>
        </div>
        <div className="dcm-hero__symbol" aria-hidden="true">CTV</div>
      </header>

      {/* Thống kê */}
      <div className="dcm-stats">
        <StatCard
          icon="CTV"
          label="Tổng CTV phù hợp"
          value={totalItems ?? '—'}
          color="blue"
        />
        <StatCard
          icon="✓"
          label="Hoạt động (trang này)"
          value={activeCount}
          color="green"
        />
        <StatCard
          icon="○"
          label="Trạng thái khác (trang này)"
          value={otherCount}
          color="orange"
        />
      </div>

      {/* Danh sách */}
      <section className="dcm-panel">
        <div className="dcm-panel__header">
          <div>
            <h2>Danh sách Cộng tác viên</h2>
            <p>Tìm kiếm, xem trạng thái và hồ sơ tài khoản.</p>
          </div>
          <button
            type="button"
            className="dcm-btn"
            onClick={reload}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>

        <form className="dcm-search" onSubmit={handleSearch}>
          <input
            type="search"
            value={keyword}
            maxLength={100}
            placeholder="Tìm theo tên, email hoặc mã CTV..."
            aria-label="Tìm kiếm Cộng tác viên"
            onChange={e => setKeyword(e.target.value)}
          />
          <button className="dcm-btn dcm-btn--primary" type="submit">
            Tìm kiếm
          </button>
          <button className="dcm-btn" type="button" onClick={clearSearch}>
            Xóa lọc
          </button>
        </form>

        {error && <div className="dcm-alert"><Alert type="error">{error}</Alert></div>}

        <div className="dcm-table-wrap">
          <table className="dcm-table">
            <thead>
              <tr>
                <th>Cộng tác viên</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Điểm uy tín</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="dcm-empty">Đang tải danh sách...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="dcm-empty">Không có CTV phù hợp.</td></tr>
              ) : items.map(item => {
                const status = getStatus(item.status)

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="dcm-user">
                        <span className="dcm-avatar">
                          {(item.fullName || '?').charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong>{item.fullName || 'Chưa có tên'}</strong>
                          <small>{item.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{item.email || '—'}</td>
                    <td>
                      <span className={`dcm-status dcm-status--${status.type}`}>
                        {status.text}
                      </span>
                    </td>
                    <td><strong>{item.reputationScore ?? '—'}</strong></td>
                    <td>
                      <button
                        type="button"
                        className="dcm-btn dcm-btn--view"
                        onClick={() => setSelectedId(item.id)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <footer className="dcm-pagination">
          <span>
            Trang {page + 1}
            {totalPages !== null && ` / ${Math.max(totalPages, 1)}`}
            {totalItems !== null && ` · ${totalItems} kết quả`}
          </span>
          <div>
            <button
              className="dcm-btn"
              disabled={page === 0 || loading}
              onClick={() => changePage(page - 1)}
            >
              Trước
            </button>
            <button
              className="dcm-btn"
              disabled={!hasNext || loading}
              onClick={() => changePage(page + 1)}
            >
              Sau
            </button>
          </div>
        </footer>
      </section>

      {/* Hồ sơ CTV */}
      {selectedId && (
        <section className="dcm-panel">
          <div className="dcm-panel__header">
            <div>
              <h2>Hồ sơ Cộng tác viên</h2>
              <p>Thông tin của tài khoản được chọn.</p>
            </div>
            <button
              className="dcm-btn"
              onClick={() => setSelectedId(null)}
            >
              Đóng
            </button>
          </div>

          <div className="dcm-detail">
            {detailError && <Alert type="error">{detailError}</Alert>}
            {detailLoading && <p>Đang tải thông tin...</p>}

            {!detailLoading && detail?.id === selectedId && (
              <>
                <div className="dcm-profile">
                  <span className="dcm-avatar dcm-avatar--large">
                    {(detail.fullName || '?').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3>{detail.fullName || 'Chưa có tên'}</h3>
                    <p>{detail.email || '—'}</p>
                  </div>
                </div>
                <div className="dcm-info-grid">
                  <InfoItem label="Mã CTV" value={detail.id} />
                  <InfoItem label="Số điện thoại" value={detail.phone} />
                  <InfoItem label="Tỉnh/thành phố" value={detail.province} />
                  <InfoItem
                    label="Trạng thái"
                    value={getStatus(detail.status).text}
                  />
                  <InfoItem label="Điểm uy tín" value={detail.reputationScore} />
                  <InfoItem label="Điểm hiệu suất" value={detail.performanceScore} />
                  <InfoItem
                    label="Ngày tạo tài khoản"
                    value={detail.createdAt
                      ? formatDateTime(detail.createdAt)
                      : '—'}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Thông tin hợp đồng và huy hiệu */}
      <section className="dcm-panel">
        <div className="dcm-panel__header">
          <div>
            <h2>Hợp đồng & huy hiệu</h2>
            <p>Thông tin quản lý dành cho Cộng tác viên.</p>
          </div>
        </div>
        <div className="dcm-feature-grid">
          <div className="dcm-feature">
            <span className="dcm-feature__icon">▤</span>
            <h3>Hợp đồng CTV</h3>
            <p>Hệ thống chưa có dữ liệu lưu trữ hợp đồng CTV.</p>
          </div>
          <div className="dcm-feature">
            <span className="dcm-feature__icon">◇</span>
            <h3>Huy hiệu xác minh</h3>
            <p>Chưa có dữ liệu huy hiệu để cấp, tạm ngừng hoặc gia hạn.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DeputyContributorManagement
