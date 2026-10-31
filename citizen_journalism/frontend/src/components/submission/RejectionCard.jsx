import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { formatDateTime } from '../../lib/format'
import '../../assets/styles/rejection.css'

/**
 * HỘP "Toà soạn không tiếp nhận hồ sơ" (phản hồi từ chối, chỉ đọc) trong trang theo dõi hồ sơ.
 * Dùng ở: components/submission/SubmissionDetail.jsx khi hồ sơ bị Biên tập viên từ chối (status REJECTED).
 * CSS: assets/styles/rejection.css. Biên tập viên viết phản hồi ở routes/editor/EditorRejectSubmission.jsx.
 *
 * Props:
 *   - rejection    : detail.rejection { reasonLabel, feedback, penaltyPoints, rejectedAt }
 *   - newReportLink: có thì hiện nút "Gửi thông tin mới" (trang của người đã đăng nhập)
 */
function RejectionCard({ rejection, newReportLink }) {
  return (
    <section className="reject-card" aria-labelledby="reject-card-title">
      <div className="reject-card__head">
        <div>
          <h3 className="reject-card__title" id="reject-card-title">
            <Icon name="alertCircle" size={20} />
            Toà soạn không tiếp nhận hồ sơ
          </h3>
          <p className="reject-card__from">Biên tập viên · {formatDateTime(rejection.rejectedAt)}</p>
        </div>
        <span className="badge badge--red">{rejection.reasonLabel}</span>
      </div>

      {rejection.feedback && <p className="reject-card__text">{rejection.feedback}</p>}

      {rejection.penaltyPoints > 0 && (
        <p className="reject-card__penalty">
          <Icon name="shield" size={14} />
          Điểm uy tín của bạn bị trừ {rejection.penaltyPoints} điểm do hồ sơ là tin rác, quảng cáo.
        </p>
      )}

      <div className="reject-card__actions">
        {newReportLink && (
          <Button to={newReportLink} className="btn--sm">
            <Icon name="send" size={16} />
            Gửi thông tin mới
          </Button>
        )}
        <a href="tel:19006668" className="btn btn--secondary btn--sm">
          <Icon name="phone" size={16} />
          Liên hệ toà soạn
        </a>
      </div>
    </section>
  )
}

export default RejectionCard
