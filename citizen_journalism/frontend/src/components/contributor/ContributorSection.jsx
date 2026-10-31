import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import ApplicationTracker from './ApplicationTracker'
import ContributorApplyForm from './ContributorApplyForm'
import EligibilityChecklist from './EligibilityChecklist'
import { useAsyncData } from '../../hooks/useAsyncData'
import { APPLICATION_STATUS } from '../../lib/contributor'
import { formatDate } from '../../lib/format'
import { contributorService } from '../../services/contributorService'
import '../../assets/styles/contributor.css'

/**
 * MỤC "CỘNG TÁC VIÊN" trong trang Hồ sơ (routes/Profile.jsx) — gom cả 2 chức năng:
 *   - Register as a Contributor   : xem điều kiện, nộp đơn (ContributorApplyForm)
 *   - Track Contributor Application: theo dõi đơn đã nộp (ApplicationTracker) + lịch sử các đơn cũ
 * Dữ liệu: GET /api/contributor-applications/me (1 lần gọi có đủ điều kiện, đơn hiện tại, lịch sử, dữ liệu form).
 *
 * CÁC TRƯỜNG HỢP HIỂN THỊ:
 *   - Đã là CTV                     -> lời chúc mừng (+ đơn đã duyệt nếu có)
 *   - Có đơn đang chờ xét            -> theo dõi đơn
 *   - Chưa có đơn / đơn cũ đã kết thúc -> (đơn cũ) + giới thiệu quyền lợi + danh sách điều kiện + nút "Đăng ký"
 *   - Đang điền đơn                  -> form đăng ký
 *
 * Props: profileKey = chuỗi ghép các ô hồ sơ ảnh hưởng điều kiện (CCCD, ngày sinh, địa chỉ, điểm uy tín).
 * Khi người dùng sửa hồ sơ ở form phía trên, profileKey đổi -> tự tải lại để danh sách điều kiện cập nhật ngay.
 */

const BENEFITS = [
  ['mapPin', 'Nhận nhiệm vụ xác minh tại hiện trường gần nơi bạn sống.'],
  ['edit', 'Viết bài, đưa tin có ghi tên bạn trên trang của toà soạn.'],
  ['gift', 'Nhận nhuận bút, điểm thưởng và thẻ Cộng tác viên.'],
]

function ContributorSection({ profileKey }) {
  // profileKey đổi (sửa hồ sơ) -> tự tải lại; reload() sau khi nộp / rút đơn (xem hooks/useAsyncData.js)
  const { data, error, reload } = useAsyncData(() => contributorService.getOverview(), profileKey)
  const [applying, setApplying] = useState(false) // Đang mở form đăng ký
  const [notice, setNotice] = useState('')

  /** Sau khi nộp / rút đơn: đóng form, báo thành công, tải lại dữ liệu. */
  const refresh = (message) => {
    setApplying(false)
    setNotice(message)
    reload()
  }

  const current = data?.current
  const hasActive = current && ['PENDING_EDITOR', 'PENDING_DEPUTY'].includes(current.status)

  return (
    <section className="account-card contributor">
      <header className="contributor__header">
        <span className="contributor__icon">
          <Icon name="award" size={22} />
        </span>
        <div>
          <h2>Cộng tác viên</h2>
          <p>Trở thành Cộng tác viên để cùng toà soạn xác minh và đưa tin dân sinh.</p>
        </div>
      </header>

      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>
      {!data && !error && <div className="skeleton skeleton--card" />}

      {data && data.role === 'CONTRIBUTOR' && (
        <div className="contributor__done">
          <Icon name="checkCircle" size={22} />
          <span>
            <strong>Bạn đang là Cộng tác viên của toà soạn.</strong>
            <small>
              Các nhiệm vụ hiện trường nằm ở mục <Link to="/contributor/tasks">Nhiệm vụ của tôi</Link>.
            </small>
          </span>
        </div>
      )}

      {data && data.role !== 'CONTRIBUTOR' && (
        <>
          {applying ? (
            <ContributorApplyForm options={data.options} onSubmitted={refresh} onCancel={() => setApplying(false)} />
          ) : (
            <>
              {current && <ApplicationTracker application={current} onWithdrawn={refresh} />}

              {/* Chưa có đơn đang chờ -> mời đăng ký (kể cả khi đơn trước bị từ chối / đã rút) */}
              {!hasActive && (
                <div className="contributor__intro">
                  {!current && (
                    <ul className="contributor__benefits">
                      {BENEFITS.map(([icon, text]) => (
                        <li key={text}>
                          <Icon name={icon} size={16} />
                          {text}
                        </li>
                      ))}
                    </ul>
                  )}
                  <h3>Điều kiện đăng ký</h3>
                  <EligibilityChecklist checks={data.eligibility.checks} />
                  <Button onClick={() => { setNotice(''); setApplying(true) }} disabled={!data.eligibility.eligible}>
                    <Icon name="award" size={16} />
                    {current ? 'Nộp đơn mới' : 'Đăng ký làm Cộng tác viên'}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Lịch sử các đơn cũ: <details> = khối thu gọn, bấm tiêu đề để mở */}
      {data?.history.length > 0 && !applying && (
        <details className="contributor__history">
          <summary>Các đơn trước đây ({data.history.length})</summary>
          <ul>
            {data.history.map((item) => {
              const status = APPLICATION_STATUS[item.status]
              return (
                <li key={item.id}>
                  <span>
                    Đơn #{item.id} · {formatDate(item.createdAt)}
                  </span>
                  <Badge tone={status?.tone}>{status?.label ?? item.status}</Badge>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}

export default ContributorSection
