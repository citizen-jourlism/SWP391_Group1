
import { useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData'
import { deputyNewsroomInsightsService } from '../../services/deputyNewsroomInsightsService'
import '../../assets/styles/deputy-newsroom-insights.css'

// TungTT - Iteration 3 - Task 5

const ROLE_NAMES = {
  EDITOR: 'Biên tập viên',
  DEPUTY_EIC: 'Phó Tổng Biên tập',
  EIC: 'Tổng Biên tập',
}

const STATUS_NAMES = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
  PENDING_OTP: 'Chưa xác thực',
}

export default function EditorialStaffDirectory() {
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const { data, error, loading, reload } = useAsyncData(
    () => deputyNewsroomInsightsService.staff(search),
    `editorial-staff-${search}`
  )

  const items = data?.items ?? []
  const selected = items.find(item => item.id === selectedId)

  const handleSearch = event => {
    event.preventDefault()
    setSelectedId(null)
    setSearch(keyword.trim())
  }

  const clearSearch = () => {
    setKeyword('')
    setSearch('')
    setSelectedId(null)
  }

  return (
    <div className="dni-page">
      <header className="dni-hero">
        <div>
          <span className="dni-eyebrow">
            EDITORIAL TEAM
          </span>
          <h1>Danh bạ nhân sự biên tập</h1>
          <p>
            Tra cứu nhân sự, vai trò, trạng thái và
            khối lượng công việc được ghi nhận.
          </p>
        </div>
        <span className="dni-hero__symbol">02</span>
      </header>

      <div className="dni-metrics dni-metrics--staff">
        <article className="dni-metric">
          <span>Nhân sự phù hợp bộ lọc</span>
          <strong>{loading ? '…' : data?.totalStaff ?? '—'}</strong>
        </article>
        <article className="dni-metric">
          <span>Biên tập viên</span>
          <strong>{loading ? '…' : data?.editors ?? '—'}</strong>
        </article>
        <article className="dni-metric">
          <span>Phó Tổng Biên tập</span>
          <strong>{loading ? '…' : data?.deputyEditors ?? '—'}</strong>
        </article>
        <article className="dni-metric">
          <span>Tổng Biên tập</span>
          <strong>{loading ? '…' : data?.editorsInChief ?? '—'}</strong>
        </article>
      </div>

      <section className="dni-panel">
        <div className="dni-toolbar">
          <div>
            <h2>Danh sách nhân sự</h2>
            <p>Thông tin lấy trực tiếp từ tài khoản tòa soạn.</p>
          </div>

          <button
            type="button"
            className="dni-button"
            onClick={reload}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>

        <form className="dni-search" onSubmit={handleSearch}>
          <input
            type="search"
            value={keyword}
            maxLength={100}
            placeholder="Tìm theo họ tên, email hoặc mã nhân sự..."
            aria-label="Tìm kiếm nhân sự"
            onChange={event => setKeyword(event.target.value)}
          />
          <button
            type="submit"
            className="dni-button dni-button--primary"
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            className="dni-button"
            onClick={clearSearch}
          >
            Xóa lọc
          </button>
        </form>

        {error && (
          <div className="dni-error" role="alert">
            {error}
          </div>
        )}

        <div className="dni-table-wrap">
          <table className="dni-table">
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Hồ sơ được giao</th>
                <th>Quyết định đã ghi</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="dni-empty">
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dni-empty">
                    Không có nhân sự phù hợp.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="dni-person">
                        <span className="dni-avatar">
                          {(item.fullName || '?')
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <span>
                          <strong>{item.fullName}</strong>
                          <small>{item.email}</small>
                        </span>
                      </div>
                    </td>

                    <td>{ROLE_NAMES[item.role] || item.role}</td>

                    <td>
                      <span
                        className={`dni-status ${
                          item.status === 'ACTIVE'
                            ? 'dni-status--active'
                            : 'dni-status--other'
                        }`}
                      >
                        {STATUS_NAMES[item.status] || item.status}
                      </span>
                    </td>

                    <td>
                      {item.assignedSubmissions == null
                        ? '—'
                        : item.assignedSubmissions}
                    </td>

                    <td>{item.reviewDecisions}</td>

                    <td>
                      <button
                        type="button"
                        className="dni-button dni-button--link"
                        onClick={() => setSelectedId(item.id)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="dni-panel">
          <div className="dni-toolbar">
            <div>
              <h2>Thông tin nhân sự</h2>
              <p>{selected.id}</p>
            </div>
            <button
              type="button"
              className="dni-button"
              onClick={() => setSelectedId(null)}
            >
              Đóng
            </button>
          </div>

          <div className="dni-detail-grid">
            <div>
              <span>Họ và tên</span>
              <strong>{selected.fullName}</strong>
            </div>
            <div>
              <span>Vai trò</span>
              <strong>{ROLE_NAMES[selected.role] || selected.role}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{selected.email}</strong>
            </div>
            <div>
              <span>Số điện thoại</span>
              <strong>{selected.phone || '—'}</strong>
            </div>
            <div>
              <span>Hồ sơ đang gắn với nhân sự</span>
              <strong>
                {selected.assignedSubmissions == null
                  ? 'Không áp dụng'
                  : selected.assignedSubmissions}
              </strong>
            </div>
            <div>
              <span>Lượt xét duyệt đã ghi nhận</span>
              <strong>{selected.reviewDecisions}</strong>
            </div>
          </div>
        </section>
      )}

      <p className="dni-footnote">
        Số hồ sơ được giao được tính theo assigned_editor_id của
        bảng submissions, không tính bài CTV gắn nhiệm vụ.
        Vai trò Deputy EIC/EIC không có quan hệ phân công trực tiếp
        qua trường này nên hiển thị “—”. Số quyết định được đếm
        từ editorial_reviews.
      </p>
    </div>
  )
}
