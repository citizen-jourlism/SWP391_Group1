
import { useState } from 'react'
import { Link } from 'react-router-dom'

import Alert from '../../components/ui/Alert'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'

import { deputyContributorService } from '../../services/deputyContributorService'

/**
 * TungTT - Danh sách đơn đăng ký cộng tác viên.
 *
 * Chức năng dành cho Phó Tổng biên tập (DEPUTY_EIC).
 * Hiển thị những đơn đã được Editor chuyển lên xét duyệt.
 *
 * Route dự kiến:
 * /leadership/contributor-applications
 *
 * Không dùng dữ liệu Demo.
 */

// Mỗi trang hiển thị tối đa 10 đơn đăng ký.
const PAGE_SIZE = 10

function DeputyContributorApplications() {

  // Lưu số trang hiện tại, bắt đầu từ trang 0.
  const [page, setPage] = useState(0)

  /**
   * Gọi API để lấy danh sách đơn đăng ký.
   * Khi page thay đổi, useAsyncData sẽ tải lại dữ liệu.
   */
  const {
    data,
    error,
    loading,
    reload,
  } = useAsyncData(
    () => deputyContributorService.list({
      page,
      size: PAGE_SIZE,
    }),
    String(page),
  )

  return (
    <section className="admin-panel">

      {/* Tiêu đề trang và nút tải lại danh sách */}
      <div className="admin-panel__header">
        <div>
          <h1>Đơn đăng ký cộng tác viên</h1>

          <p>
            Đơn đã qua bước xét duyệt của Biên tập viên
            và đang chờ Phó Tổng biên tập.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--secondary"
          onClick={reload}
        >
          Làm mới
        </button>
      </div>

      {/* Hiển thị thông báo lỗi nếu API thất bại */}
      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>

        <table className="data-table">
          <thead>
            <tr>
              <th>Người đăng ký</th>
              <th>Lĩnh vực</th>
              <th>Khu vực</th>
              <th>Điểm uy tín</th>
              <th>Ngày nộp</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>

            {/* Trạng thái đang tải dữ liệu */}
            {loading && !data && (
              <tr>
                <td colSpan={6}>Đang tải danh sách...</td>
              </tr>
            )}

            {/* Chưa có dữ liệu trả về */}
            {!loading && !data && !error && (
              <tr>
                <td colSpan={6}>Chưa có dữ liệu.</td>
              </tr>
            )}

            {/* Danh sách trả về rỗng */}
            {data?.items?.length === 0 && (
              <tr>
                <td colSpan={6}>
                  Không có đơn chờ xét duyệt.
                </td>
              </tr>
            )}

            {/* Hiển thị các đơn lấy từ Backend */}
            {data?.items?.map((item) => (
              <tr key={item.id}>

                <td>
                  <strong>{item.applicantName}</strong>
                  <div>{item.applicantId}</div>
                </td>

                <td>
                  {item.expertiseFields?.join(', ') || '—'}
                </td>

                <td>{item.province || '—'}</td>

                <td>{item.reputationScore ?? '—'}</td>

                <td>
                  {formatDateTime(item.createdAt)}
                </td>

                <td>
                  <Link
                    className="desk-open"
                    to={`/leadership/contributor-applications/${item.id}`}
                  >
                    Xem và xét duyệt
                  </Link>
                </td>

              </tr>
            ))}

          </tbody>
        </table>

      </div>

      {/* Phân trang theo dữ liệu Backend trả về */}
      {data && (
        <Pagination
          page={data.page}
          size={data.size}
          totalItems={data.totalItems}
          totalPages={data.totalPages}
          onChange={setPage}
        />
      )}

    </section>
  )
}

export default DeputyContributorApplications
