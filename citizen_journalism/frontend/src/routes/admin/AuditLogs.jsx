
import { useEffect, useState } from 'react'
import { auditHistoryService } from '../../services/auditHistoryService'
import '../../assets/styles/audit-logs.css'

const PAGE_SIZE = 20

export default function AuditLogs() {
  const [source, setSource] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const filters = {
    source,
    from: from || undefined,
    to: to || undefined,
  }

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    auditHistoryService
      .search({ ...filters, page, size: PAGE_SIZE })
      .then((response) => {
        if (active) setData(response.data)
      })
      .catch((cause) => {
        if (active) {
          setError(cause.message || 'Không tải được lịch sử.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [source, from, to, page])

  async function exportCsv() {
    setExporting(true)
    setError('')

    try {
      await auditHistoryService.exportCsv(filters)
    } catch (cause) {
      setError(cause.message || 'Không xuất được CSV.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="audit-page">
      <div className="audit-heading">
        <div>
          <h1>Lịch sử hoạt động</h1>
          <p>
            Theo dõi lịch sử xử lý hồ sơ và thay đổi điểm uy tín
            trong hệ thống.
          </p>
        </div>

        <span className="audit-count">
          {data?.totalItems ?? 0} bản ghi
        </span>
      </div>

      <div className="audit-panel">
        <div className="audit-panel-header">
          <div>
            <h2>Bộ lọc lịch sử</h2>
            <p>Lọc theo nguồn dữ liệu và khoảng thời gian</p>
          </div>
        </div>

        <div className="audit-filters">
          <label className="audit-field">
            <span>Nguồn dữ liệu</span>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Tất cả</option>
              <option value="SUBMISSION">Lịch sử hồ sơ</option>
              <option value="REPUTATION">Điểm uy tín</option>
            </select>
          </label>

          <label className="audit-field">
            <span>Từ ngày</span>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(0)
              }}
            />
          </label>

          <label className="audit-field">
            <span>Đến ngày</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(0)
              }}
            />
          </label>

          <button
            type="button"
            className="audit-export-btn"
            onClick={exportCsv}
            disabled={exporting}
          >
            {exporting ? 'Đang xuất...' : 'Xuất CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="audit-error" role="alert">
          {error}
        </div>
      )}

      <div className="audit-panel audit-table-panel">
        <div className="audit-panel-header">
          <div>
            <h2>Danh sách lịch sử</h2>
            <p>Các hoạt động được ghi nhận trong hệ thống</p>
          </div>
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Nguồn</th>
                <th>Thời gian</th>
                <th>Vai trò</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Mô tả</th>
              </tr>
            </thead>

            <tbody>
              {(data?.items || []).map((item) => (
                <tr key={`${item.source}-${item.id}`}>
                  <td>
                    <span className="audit-source-badge">
                      {item.source}
                    </span>
                  </td>

                  <td className="audit-date">
                    {item.occurredAt?.replace('T', ' ') || '—'}
                  </td>

                  <td>
                    <span className="audit-role">
                      {item.actorRole || 'Không ghi nhận'}
                    </span>
                  </td>

                  <td>
                    <span className="audit-action">
                      {item.action}
                    </span>
                  </td>

                  <td>{item.targetId || '—'}</td>
                  <td className="audit-description">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="audit-empty">Đang tải dữ liệu...</div>
          )}

          {!loading && data?.items?.length === 0 && (
            <div className="audit-empty">
              Không có lịch sử phù hợp.
            </div>
          )}
        </div>

        <div className="audit-pagination">
          <span>
            Tổng số: <strong>{data?.totalItems ?? 0}</strong> bản ghi
          </span>

          <div className="audit-pagination-controls">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trang trước
            </button>

            <span>
              Trang {page + 1} / {Math.max(1, data?.totalPages || 1)}
            </span>

            <button
              type="button"
              disabled={
                loading || page + 1 >= (data?.totalPages || 0)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
