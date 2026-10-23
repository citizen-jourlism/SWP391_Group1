import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import CopyButton from '../ui/CopyButton'
import Icon from '../ui/Icon'
import EvidenceList from './EvidenceList'
import ProcessSteps from './ProcessSteps'
import { formatDateTime } from '../../lib/format'
import { ACTOR_LABELS, CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import '../../assets/styles/tracking.css'

/**
 * CHI TIẾT + TIẾN ĐỘ một hồ sơ. Chỉ hiển thị, không gọi API.
 * Dùng ở: routes/TrackSubmission.jsx (tra cứu bằng mã + PIN), routes/MySubmissionDetail.jsx (từ "Thông tin đã gửi").
 * Dữ liệu: `detail` = SubmissionDetail do backend trả về. CSS: assets/styles/tracking.css.
 *
 * BỐ CỤC:
 *   ┌ Đầu hồ sơ: mã hồ sơ (sao chép được), nhãn trạng thái, tiêu đề, loại, thời gian + thanh tiến trình 6 giai đoạn ┐
 *   ├ [Chỉ khi trạng thái "Cần bổ sung"] Hộp vàng: lời nhắn toà soạn đề nghị bổ sung (Editorial Request Note)       ┤
 *   ├ Trái: thông tin sự việc (thời điểm, địa điểm, tóm tắt, nội dung, tệp)  │  Phải: NHẬT KÝ XỬ LÝ (mới nhất trên cùng) ┤
 */
function SubmissionDetail({ detail }) {
  const status = SUBMISSION_STATUS[detail.status] ?? { label: detail.status, tone: 'neutral', stage: 0 }
  const category = CATEGORY_BY_VALUE[detail.category]
  // Đánh số bước theo thứ tự thời gian (bước 1 = lúc gửi), rồi đảo ngược để bước MỚI NHẤT hiện trên cùng
  const timeline = detail.timeline.map((entry, index) => ({ ...entry, step: index + 1 })).reverse()

  return (
    <div className="detail">
      {/* ----- Đầu hồ sơ ----- */}
      <section className="detail-card detail-head">
        <div className="detail-head__top">
          <span className="detail-head__code">
            Mã hồ sơ <strong>{detail.trackingCode}</strong>
            <CopyButton text={detail.trackingCode} label="Sao chép mã hồ sơ" iconOnly variant="ghost" />
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <h2>{detail.title}</h2>
        <p className="detail-head__meta">
          {category && (
            <span>
              <Icon name={category.icon} size={14} />
              {category.label}
            </span>
          )}
          <span>
            <Icon name="clock" size={14} />
            Gửi lúc {formatDateTime(detail.createdAt)}
          </span>
          {detail.anonymous && (
            <span>
              <Icon name="eyeOff" size={14} />
              Gửi ẩn danh
            </span>
          )}
        </p>
        <p className="detail-head__hint">
          <Icon name="info" size={16} />
          {status.hint}
        </p>
        <ProcessSteps stage={status.stage} ended={status.ended} layout="horizontal" />
      </section>

      {detail.requestNote && (
        <Alert type="warning" title="Toà soạn đề nghị bổ sung thông tin">
          {detail.requestNote}
        </Alert>
      )}

      <div className="detail-grid">
        {/* ----- Thông tin sự việc ----- */}
        <section className="detail-card">
          <h3>Thông tin sự việc</h3>
          <dl className="detail-facts">
            <div>
              <dt>Thời điểm xảy ra</dt>
              <dd>{formatDateTime(detail.incidentAt)}</dd>
            </div>
            <div>
              <dt>Địa điểm</dt>
              <dd>
                {detail.address}, {detail.province}
              </dd>
            </div>
            <div className="detail-facts__wide">
              <dt>Tóm tắt</dt>
              <dd>{detail.summary}</dd>
            </div>
          </dl>
          <h4>Nội dung chi tiết</h4>
          {/* white-space: pre-line trong CSS để giữ nguyên các lần xuống dòng người gửi đã gõ */}
          <p className="detail-content">{detail.content}</p>
          <h4>Tư liệu ({detail.evidences.length})</h4>
          <EvidenceList evidences={detail.evidences} />
        </section>

        {/* ----- Nhật ký xử lý: số bước, thời điểm, người thực hiện, mô tả ----- */}
        <section className="detail-card">
          <h3>Nhật ký xử lý</h3>
          <ol className="timeline">
            {timeline.map((entry) => (
              <li key={entry.step} className={entry.step === detail.timeline.length ? 'is-latest' : ''}>
                <span className="timeline__step">{entry.step}</span>
                <div className="timeline__body">
                  <div className="timeline__meta">
                    <strong>{ACTOR_LABELS[entry.actor] ?? entry.actor}</strong>
                    <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                  </div>
                  <p>{entry.description}</p>
                  {entry.note && <blockquote>{entry.note}</blockquote>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default SubmissionDetail
