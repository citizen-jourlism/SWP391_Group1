
import { useEffect, useState } from 'react'
import { auditHistoryService } from '../../services/auditHistoryService'

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
    <section style={{ padding: 24 }}>
      <h1>Lịch sử hiện có</h1>

      <p>
        Chỉ gồm lịch sử xử lý hồ sơ và thay đổi điểm uy tín;
        không phải audit log toàn hệ thống.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'end',
        }}
      >
        <label>
          Nguồn dữ liệu{' '}
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

        <label>
          Từ{' '}
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(0)
            }}
          />
        </label>

        <label>
          Đến{' '}
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(0)
            }}
          />
        </label>

        <button onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Đang xuất...' : 'Xuất CSV'}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      {loading && <p>Đang tải...</p>}

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
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
                <td>{item.source}</td>
                <td>
                  {item.occurredAt?.replace('T', ' ')}
                </td>
                <td>
                  {item.actorRole || 'Không ghi nhận'}
                </td>
                <td>{item.action}</td>
                <td>{item.targetId}</td>
                <td>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && data?.items?.length === 0 && (
          <p>Không có lịch sử phù hợp.</p>
        )}
      </div>

      <p>Tổng số: {data?.totalItems ?? 0}</p>

      <button
        disabled={page === 0 || loading}
        onClick={() => setPage((p) => p - 1)}
      >
        Trang trước
      </button>

      {' '}
      <span>
        Trang {page + 1} / {Math.max(1, data?.totalPages || 1)}
      </span>
      {' '}

      <button
        disabled={
          loading || page + 1 >= (data?.totalPages || 0)
        }
        onClick={() => setPage((p) => p + 1)}
      >
        Trang sau
      </button>
    </section>
  )
}
