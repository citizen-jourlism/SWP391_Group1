import { useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import CancelSubmissionDialog from './CancelSubmissionDialog'
import { useAuth } from '../../hooks/useAuth'
import { findCancellation } from '../../lib/cancellation'
import { formatDateTime } from '../../lib/format'
import '../../assets/styles/cancellation.css'

/*
 * KHỐI "HUỶ HỒ SƠ" trong trang theo dõi hồ sơ của tôi (routes/MySubmissionDetail.jsx), nằm ngay dưới đầu hồ sơ.
 * Chỉ dùng cho người gửi ĐÃ ĐĂNG NHẬP; trang Tra cứu bằng mã + PIN không có khối này. CSS: assets/styles/cancellation.css.
 *
 * Hiện theo trạng thái hồ sơ:
 *   - PENDING (toà soạn chưa xử lý)  : thanh "Huỷ hồ sơ" -> mở CancelSubmissionDialog
 *   - IN_REVIEW (BTV đang thẩm định) : thanh xám "Không thể huỷ hồ sơ" + số đường dây nóng
 *   - CANCELLED                      : hộp "Bạn đã huỷ hồ sơ này" (lý do + ghi chú, đọc từ nhật ký) + nút gửi hồ sơ mới
 *   - Trạng thái khác                : không hiện gì
 *
 * Props:
 *   - detail      : chi tiết hồ sơ (SubmissionDetail từ backend)
 *   - onCancelled : (chiTiếtMới) => ... trang cha thay dữ liệu bằng kết quả sau khi huỷ
 *   - onReload    : tải lại hồ sơ (khi huỷ thất bại vì toà soạn vừa xử lý)
 */
function CancelSubmissionPanel({ detail, onCancelled, onReload }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  if (detail.status === 'PENDING') {
    return (
      <section className="cancel-bar">
        <p className="cancel-bar__text">
          <Icon name="info" size={20} />
          <span>
            <strong>Toà soạn chưa bắt đầu xử lý hồ sơ này</strong>
            <small>Bạn có thể huỷ nếu gửi nhầm, gửi trùng hoặc sự việc đã được giải quyết. Hồ sơ đã huỷ không khôi phục được.</small>
          </span>
        </p>
        <Button variant="danger-outline" className="btn--sm" onClick={() => setOpen(true)}>
          <Icon name="trash" size={16} />
          Huỷ hồ sơ
        </Button>
        {/* Chỉ render khi mở -> mỗi lần mở là một form trống mới */}
        {open && (
          <CancelSubmissionDialog
            detail={detail}
            role={user?.role}
            onClose={() => setOpen(false)}
            onCancelled={(next) => {
              setOpen(false)
              onCancelled(next)
            }}
            onConflict={() => {
              setOpen(false)
              onReload()
            }}
          />
        )}
      </section>
    )
  }

  if (detail.status === 'IN_REVIEW') {
    return (
      <section className="cancel-bar cancel-bar--locked">
        <p className="cancel-bar__text">
          <Icon name="lock" size={20} />
          <span>
            <strong>Không thể huỷ hồ sơ</strong>
            <small>
              Biên tập viên đã bắt đầu thẩm định nên hồ sơ không huỷ được nữa. Nếu cần dừng xử lý, vui lòng gọi đường dây
              nóng <b>1900 6668</b>.
            </small>
          </span>
        </p>
      </section>
    )
  }

  const cancellation = findCancellation(detail)
  if (!cancellation) return null

  return (
    <section className="cancel-card" aria-labelledby="cancel-card-title">
      <div className="cancel-card__head">
        <div>
          <h3 className="cancel-card__title" id="cancel-card-title">
            <Icon name="x" size={20} />
            Bạn đã huỷ hồ sơ này
          </h3>
          <p className="cancel-card__from">Người gửi · {formatDateTime(cancellation.cancelledAt)}</p>
        </div>
        <Badge tone="neutral">{cancellation.reasonLabel}</Badge>
      </div>
      {cancellation.note && <p className="cancel-card__text">{cancellation.note}</p>}
      <div className="cancel-card__actions">
        {/* Chuyên gia: gợi ý viết bài nghiên cứu (thường huỷ tin báo để chuyển thành bài phân tích) */}
        {user?.role === 'EXPERT' && (
          <Button to="/research/new" className="btn--sm">
            <Icon name="edit" size={16} />
            Viết bài nghiên cứu
          </Button>
        )}
        <Button to="/submit" variant={user?.role === 'EXPERT' ? 'secondary' : 'primary'} className="btn--sm">
          <Icon name="send" size={16} />
          Gửi thông tin mới
        </Button>
      </div>
    </section>
  )
}

export default CancelSubmissionPanel
