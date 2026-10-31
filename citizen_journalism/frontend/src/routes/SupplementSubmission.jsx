import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import EvidenceList from '../components/submission/EvidenceList'
import ProcessSteps from '../components/submission/ProcessSteps'
import RequestNoteCard from '../components/submission/RequestNoteCard'
import SupplementForm from '../components/submission/SupplementForm'
import Alert from '../components/ui/Alert'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDateTime, formatFileSize } from '../lib/format'
import { ACTOR_LABELS, CATEGORY_BY_VALUE, FILE_TYPE_INFO, SUBMISSION_STATUS, fileTypeOf } from '../lib/submission'
import { submissionService } from '../services/submissionService'
import '../assets/styles/submit.css'
import '../assets/styles/tracking.css'
import '../assets/styles/supplement.css'

/*
 * BỔ SUNG THÔNG TIN cho 1 hồ sơ — /account/submissions/:code/supplement (UC "Provide Additional Information").
 * Chỉ người dân / CTV / chuyên gia đã đăng nhập, và chỉ hồ sơ của chính mình (backend kiểm tra như GET /submissions/mine/{code}).
 * Mở từ: nút "Bổ sung ngay" trong hộp "Toà soạn đề nghị bổ sung" ở trang Theo dõi hồ sơ (SubmissionDetail).
 *
 * BỐ CỤC:
 *   ┌ Đầu hồ sơ: mã, nhãn trạng thái, tiêu đề, thanh tiến trình                                      ┐
 *   ├ Hộp lời nhắn của toà soạn (RequestNoteCard)                                                    ┤
 *   ├ Trái: SupplementForm (dạng Người dân / Chuyên gia theo vai trò) │ Phải: hồ sơ đã gửi + nhật ký ┤
 * Gửi xong -> màn "Đã gửi bổ sung": tóm tắt nội dung vừa gửi + nút quay lại theo dõi hồ sơ.
 * Hồ sơ KHÔNG ở trạng thái "Cần bổ sung" (đã bổ sung rồi, đã xử lý...) -> báo không cần bổ sung, không hiện form.
 */
function SupplementSubmission() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isExpert = user?.role === 'EXPERT'
  useDocumentTitle(`Bổ sung hồ sơ ${code}`)

  // Tải song song chi tiết hồ sơ + giới hạn tệp
  const { data, error, reload } = useAsyncData(
    () =>
      Promise.all([submissionService.getMine(code), submissionService.getOptions()]).then(([detail, options]) => ({
        data: { detail: detail.data, options: options.data },
      })),
    code,
  )
  const [sent, setSent] = useState(null) // { payload, files } sau khi gửi thành công

  const detailPath = `/account/submissions/${encodeURIComponent(code)}`
  const backLink = { to: detailPath, label: `Theo dõi hồ sơ ${code}` }

  if (error && !data) {
    return (
      <AccountLayout title="Bổ sung thông tin" backLink={backLink}>
        <Alert type="error" title="Không mở được hồ sơ">
          {error}
          <div className="alert__actions">
            <Button variant="secondary" onClick={reload}>
              <Icon name="refresh" size={16} />
              Thử lại
            </Button>
          </div>
        </Alert>
      </AccountLayout>
    )
  }

  if (!data) {
    return (
      <AccountLayout title="Bổ sung thông tin" backLink={backLink}>
        <div className="skeleton skeleton--page" />
      </AccountLayout>
    )
  }

  const { detail, options } = data

  if (sent) {
    return (
      <AccountLayout title="Bổ sung thông tin" backLink={backLink}>
        <SentView code={detail.trackingCode} sent={sent} detailPath={detailPath} />
      </AccountLayout>
    )
  }

  if (detail.status !== 'NEED_MORE_INFO') {
    const status = SUBMISSION_STATUS[detail.status]
    return (
      <AccountLayout title="Bổ sung thông tin" backLink={backLink}>
        <Alert type="info" title="Hồ sơ hiện không cần bổ sung">
          Hồ sơ {detail.trackingCode} đang ở trạng thái “{status?.label ?? detail.status}”. Toà soạn sẽ báo khi cần thêm thông tin.
          <div className="alert__actions">
            <Button variant="secondary" to={detailPath}>
              Xem tiến độ hồ sơ
            </Button>
          </div>
        </Alert>
      </AccountLayout>
    )
  }

  const status = SUBMISSION_STATUS[detail.status]
  const category = CATEGORY_BY_VALUE[detail.category]
  const requestFrom = detail.timeline[detail.timeline.length - 1] // Lời nhắn = ghi chú của bước gần nhất (như backend)
  const recent = detail.timeline.map((entry, index) => ({ ...entry, step: index + 1 })).reverse()

  return (
    <AccountLayout
      title="Bổ sung thông tin"
      subtitle={
        isExpert
          ? 'Trả lời các câu hỏi của biên tập viên và bổ sung nguồn, tư liệu chuyên môn cho bài viết của bạn.'
          : 'Gửi thêm giải thích hoặc tư liệu theo đề nghị của toà soạn để hồ sơ được xử lý tiếp.'
      }
      backLink={backLink}
    >
      <div className="detail supplement-page">
        <section className="detail-card detail-head">
          <div className="detail-head__top">
            <span className="detail-head__code">
              Mã hồ sơ <strong>{detail.trackingCode}</strong>
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
          </p>
          <p className="detail-head__hint">
            <Icon name="info" size={16} />
            {status.hint}
          </p>
          <ProcessSteps stage={status.stage} layout="horizontal" />
        </section>

        <RequestNoteCard note={detail.requestNote} from={requestFrom} />

        <div className="submit-layout">
          <SupplementForm
            detail={detail}
            options={options}
            isExpert={isExpert}
            onCancel={() => navigate(detailPath)}
            onSubmitted={(result) => {
              setSent(result)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />

          {/* ----- Cột phải: hồ sơ đã gửi + nhật ký ----- */}
          <aside className="submit-aside">
            <div className="submit-aside__card origin-card">
              <h3>
                <Icon name="fileText" size={18} />
                Hồ sơ đã gửi
              </h3>
              <dl>
                <div>
                  <dt>Địa điểm</dt>
                  <dd>
                    {detail.address}, {detail.province}
                  </dd>
                </div>
                <div>
                  <dt>Tóm tắt</dt>
                  <dd>{detail.summary}</dd>
                </div>
                <div>
                  <dt>Tư liệu đã nộp ({detail.evidences.length})</dt>
                  <dd>
                    <EvidenceList evidences={detail.evidences} />
                  </dd>
                </div>
              </dl>
            </div>
            <div className="submit-aside__card">
              <h3>
                <Icon name="clock" size={18} />
                Nhật ký xử lý
              </h3>
              <ol className="timeline">
                {recent.map((entry) => (
                  <li key={entry.step} className={entry.step === detail.timeline.length ? 'is-latest' : ''}>
                    <span className="timeline__step">{entry.step}</span>
                    <div className="timeline__body">
                      <div className="timeline__meta">
                        <strong>{ACTOR_LABELS[entry.actor] ?? entry.actor}</strong>
                        <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                      </div>
                      <p>{entry.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </AccountLayout>
  )
}

/** Màn hình sau khi gửi bổ sung thành công: thông báo + tóm tắt những gì vừa gửi. */
function SentView({ code, sent, detailPath }) {
  const { payload, files } = sent
  return (
    <div className="detail">
      <section className="detail-card sent-card">
        <span className="sent-card__icon">
          <Icon name="checkCircle" size={34} />
        </span>
        <h2>Đã gửi bổ sung cho toà soạn</h2>
        <p>
          Hồ sơ <b>{code}</b> được chuyển lại cho biên tập viên thẩm định. Bạn theo dõi tiến độ tại trang hồ sơ.
        </p>
        <div className="sent-card__actions">
          <Button to={detailPath}>Theo dõi hồ sơ</Button>
          <Button to="/account/submissions" variant="secondary">
            Thông tin đã gửi
          </Button>
        </div>
      </section>

      <section className="detail-card sent-summary">
        <h3>Nội dung bạn vừa gửi</h3>
        {payload.address && (
          <div>
            <p className="sent-summary__label">Địa chỉ cập nhật</p>
            <p className="detail-content">{payload.address}</p>
          </div>
        )}
        {payload.additionalInfo && (
          <div>
            <p className="sent-summary__label">Thông tin bổ sung</p>
            <p className="detail-content">{payload.additionalInfo}</p>
          </div>
        )}
        {payload.sources.length > 0 && (
          <div>
            <p className="sent-summary__label">Nguồn tham khảo ({payload.sources.length})</p>
            <ul className="evidence-list">
              {payload.sources.map((source, index) => (
                <li key={index}>
                  <Icon name="link" size={18} />
                  <span>
                    <strong>{source.title}</strong>
                    {source.url && <small>{source.url}</small>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {files.length > 0 && (
          <div>
            <p className="sent-summary__label">Tệp bổ sung ({files.length})</p>
            <ul className="evidence-list">
              {files.map((file) => {
                const typeInfo = FILE_TYPE_INFO[fileTypeOf(file.type)]
                return (
                  <li key={`${file.name}-${file.size}`}>
                    <Icon name={typeInfo.icon} size={18} />
                    <span>
                      <strong>{file.name}</strong>
                      <small>
                        {typeInfo.label} · {formatFileSize(file.size)}
                      </small>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

export default SupplementSubmission
