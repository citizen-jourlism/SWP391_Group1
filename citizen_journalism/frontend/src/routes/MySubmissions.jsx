import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import Alert from '../components/ui/Alert'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Pagination from '../components/ui/Pagination'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDateTime } from '../lib/format'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../lib/submission'
import { submissionService } from '../services/submissionService'
import '../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)
import '../assets/styles/tracking.css'

/*
 * TRANG "HỒ SƠ ĐÃ GỬI" — /account/submissions, chỉ người dân / CTV / chuyên gia (ProtectedRoute trong App.jsx).
 * Mở từ: menu tài khoản -> "Thông tin đã gửi", trang Tra cứu, biên nhận sau khi gửi.
 * Dữ liệu: GET /api/submissions/mine?page=&size=10 (mới nhất trước).
 *
 * Mỗi hồ sơ là một thẻ: loại phản ánh, tiêu đề, mã hồ sơ, nhãn trạng thái, thời gian gửi.
 * Bấm vào thẻ -> /account/submissions/<mã> (MySubmissionDetail) xem tiến độ, KHÔNG cần nhập PIN.
 *
 * CÁCH TẢI (giống trang admin): kết quả lưu kèm số trang của nó (`result.page`).
 * Số trang hiện tại khác số trang của kết quả = đang tải trang mới -> làm mờ danh sách cũ thay vì xoá trắng.
 */

const PAGE_SIZE = 10

function MySubmissions() {
  useDocumentTitle('Thông tin đã gửi')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState({ page: null, data: null, error: '' })

  useEffect(() => {
    let cancelled = false // Bỏ qua kết quả cũ nếu người dùng đã chuyển trang trong lúc chờ
    submissionService
      .listMine(page, PAGE_SIZE)
      .then((response) => !cancelled && setResult({ page, data: response.data, error: '' }))
      .catch((error) => !cancelled && setResult({ page, data: null, error: error.message }))
    return () => {
      cancelled = true
    }
  }, [page])

  const loading = result.page !== page
  const data = result.data

  return (
    <AccountLayout title="Thông tin đã gửi" subtitle="Theo dõi tiến độ xử lý các tin nóng, khiếu nại bạn đã gửi tới toà soạn.">
      <div className="my-subs__toolbar">
        <p>{data && `Bạn có ${data.totalItems} hồ sơ`}</p>
        <Button to="/submit" className="btn--sm">
          <Icon name="plus" size={16} />
          Gửi thông tin mới
        </Button>
      </div>

      <Alert type="error">{result.error}</Alert>

      {!data && loading && (
        <div className="my-subs">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton skeleton--card" />
          ))}
        </div>
      )}

      {/* ----- Chưa có hồ sơ nào ----- */}
      {data?.items.length === 0 && (
        <div className="detail-card my-subs__empty">
          <span className="my-subs__empty-icon">
            <Icon name="fileText" size={30} />
          </span>
          <h2>Bạn chưa gửi hồ sơ nào</h2>
          <p>Khi phát hiện sự việc cần phản ánh, hãy gửi cho toà soạn. Tiến độ xử lý sẽ hiện ở đây.</p>
          <Button to="/submit">
            <Icon name="send" size={16} />
            Gửi thông tin đầu tiên
          </Button>
        </div>
      )}

      {data?.items.length > 0 && (
        <>
          <ul className={`my-subs ${loading ? 'is-loading' : ''}`}>
            {data.items.map((item) => {
              const status = SUBMISSION_STATUS[item.status] ?? { label: item.status, tone: 'neutral' }
              const category = CATEGORY_BY_VALUE[item.category]
              return (
                <li key={item.trackingCode}>
                  <Link to={`/account/submissions/${item.trackingCode}`} className="sub-item">
                    <span className={`category-card__icon category-card__icon--${category?.slug ?? 'complaint'}`}>
                      <Icon name={category?.icon ?? 'fileText'} size={20} />
                    </span>
                    <span className="sub-item__main">
                      <span className="sub-item__top">
                        <span className="sub-item__code">{item.trackingCode}</span>
                        <span className="sub-item__category">{category?.label}</span>
                        {item.anonymous && (
                          <span className="sub-item__anon">
                            <Icon name="eyeOff" size={12} />
                            Ẩn danh
                          </span>
                        )}
                      </span>
                      <strong className="sub-item__title">{item.title}</strong>
                      <small>
                        Gửi lúc {formatDateTime(item.createdAt)} · {item.province}
                      </small>
                    </span>
                    <span className="sub-item__side">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="sub-item__more">
                        Xem tiến độ
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

export default MySubmissions
