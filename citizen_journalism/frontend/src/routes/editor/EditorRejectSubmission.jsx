import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import EvidenceList from '../../components/submission/EvidenceList'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import ResultView from '../../components/ui/ResultView'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { REJECT_LIMITS, REJECT_REASONS, REJECT_REASON_BY_VALUE, validateRejection } from '../../lib/rejection'
import { ROLE_LABELS } from '../../lib/roles'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import { editorService } from '../../services/editorService'
import '../../assets/styles/rejection.css'
import '../../assets/styles/submit.css' // Danh sách tệp (.evidence-list)
import '../../assets/styles/tracking.css' // Đầu hồ sơ, nội dung (.detail-head__*, .detail-content)

/*
 * TỪ CHỐI HỒ SƠ (Reject Submission, Biên tập viên) — /editor/queue/:code/reject.
 * Mở từ nút "Từ chối" ở chi tiết hồ sơ (EditorSubmissionDetail). Biên tập viên chọn lý do, viết phản hồi gửi người gửi,
 * (tuỳ chọn) trừ điểm uy tín nếu là tin rác, xác nhận lần cuối rồi hồ sơ chuyển sang "Không tiếp nhận".
 *
 * API (backend CHƯA có, xem services/editorService.js):
 *   GET  /api/editor/submissions/{mã}/rejection -> { submission, reporter, screening, rejectable, penaltyPoints, review }
 *        submission : SubmissionDetail (như GET /api/editor/submissions/{mã})
 *        reporter   : null nếu gửi ẩn danh | { fullName, role, reputationScore, email (đã che bớt), rejectedCount }
 *        screening  : { isSpam, aiSummary, spamScore, credibilityScore, suggestedReason, aiReason }
 *        rejectable : hồ sơ còn ở bước biên tập (PENDING / IN_REVIEW / NEED_MORE_INFO)
 *        review     : null | lần từ chối đã lưu { reason, reasonLabel, feedback, internalNote, penaltyPoints, reviewerName, rejectedAt }
 *   POST /api/editor/submissions/{mã}/reject { reason, feedback, internalNote, applyPenalty } -> dữ liệu mới (cùng dạng GET)
 *   Cách lưu vào DB: xem chú thích đầu lib/rejection.js.
 *
 * TRẠNG THÁI MÀN HÌNH: form từ chối | hộp xác nhận | đã từ chối | không thể từ chối (hồ sơ đã qua bước biên tập).
 */

function EditorRejectSubmission() {
  const { code } = useParams()
  const { data, error, setData } = useAsyncData(() => editorService.getRejection(code), code)
  // null = chưa chọn / chưa sửa: dùng lý do AI gợi ý và câu phản hồi mẫu của lý do đó
  const [reason, setReason] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [note, setNote] = useState('')
  const [applyPenalty, setApplyPenalty] = useState(true)
  const [submitted, setSubmitted] = useState(false) // Đã bấm "Từ chối" ít nhất 1 lần -> bắt đầu hiện lỗi
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [saveError, setSaveError] = useState('')

  const back = (
    <Link to={`/editor/queue/${code}`} className="desk-back">
      <Icon name="arrowLeft" size={16} />
      Hồ sơ {code}
    </Link>
  )

  if (error && !data) {
    return (
      <div className="desk-detail">
        {back}
        <Alert type="error">{error}</Alert>
      </div>
    )
  }

  if (!data) return <div className="skeleton skeleton--page" />

  const { submission, reporter, screening, rejectable, penaltyPoints, review } = data
  const status = SUBMISSION_STATUS[submission.status]
  const category = CATEGORY_BY_VALUE[submission.category]

  // ===== Đã từ chối =====
  if (review) {
    return (
      <div className="desk-detail">
        {back}
        <section className="admin-panel">
          <div className="reject-result">
            <ResultView
              tone="danger"
              text={`Đã từ chối hồ sơ ${submission.trackingCode}. Hồ sơ chuyển sang "Không tiếp nhận" và rời khỏi hàng đợi.`}
            >
              <dl className="credential-box reject-summary">
                <dt>Lý do</dt>
                <dd>{review.reasonLabel}</dd>
                <dt>Phản hồi</dt>
                <dd>{review.feedback}</dd>
                <dt>Thông báo</dt>
                <dd>{reporter ? `Đã gửi email tới ${reporter.email}` : 'Người gửi ẩn danh, xem được khi tra cứu bằng mã hồ sơ + PIN'}</dd>
                <dt>Uy tín</dt>
                <dd>{review.penaltyPoints ? `Trừ ${review.penaltyPoints} điểm (còn ${reporter?.reputationScore})` : 'Không trừ điểm'}</dd>
                <dt>Lưu lúc</dt>
                <dd>
                  {formatDateTime(review.rejectedAt)}
                  {review.reviewerName && ` · BTV ${review.reviewerName}`}
                </dd>
              </dl>
              <Button to="/editor/queue">Về hàng đợi tin bài</Button>
              <Button to={`/editor/queue/${code}`} variant="secondary">
                Xem lại hồ sơ
              </Button>
            </ResultView>
          </div>
        </section>
      </div>
    )
  }

  // ===== Hồ sơ đã qua bước biên tập =====
  if (!rejectable) {
    return (
      <div className="desk-detail">
        {back}
        <section className="admin-panel">
          <div className="reject-result">
            <ResultView
              tone="muted"
              text={`Hồ sơ ${submission.trackingCode} đang ở trạng thái "${status?.label ?? submission.status}", không thể từ chối ở bước biên tập. Biên tập viên chỉ từ chối được hồ sơ Đã tiếp nhận, Đang thẩm định hoặc Cần bổ sung. Nếu thấy có vấn đề, hãy báo Phó Tổng biên tập phụ trách.`}
            >
              <Button to={`/editor/queue/${code}`}>Về chi tiết hồ sơ</Button>
              <Button to="/editor/queue" variant="secondary">
                Về hàng đợi tin bài
              </Button>
            </ResultView>
          </div>
        </section>
      </div>
    )
  }

  // ===== Form từ chối =====
  const currentReason = reason ?? screening.suggestedReason ?? ''
  const currentFeedback = feedback ?? (currentReason ? REJECT_REASON_BY_VALUE[currentReason].template(submission.trackingCode) : '')
  const canPenalize = currentReason === 'SPAM' && Boolean(reporter)
  const penalize = canPenalize && applyPenalty
  const errors = validateRejection({ reason: currentReason, feedback: currentFeedback, note })
  const hasError = Object.values(errors).some(Boolean)
  const shown = submitted ? errors : {}

  /** Đổi lý do -> điền lại câu phản hồi mẫu của lý do đó (BTV sửa tiếp được). */
  const chooseReason = (value) => {
    setReason(value)
    setFeedback(REJECT_REASON_BY_VALUE[value].template(submission.trackingCode))
  }

  const askConfirm = () => {
    setSubmitted(true)
    if (hasError) return
    setSaveError('')
    setConfirming(true)
  }

  const reject = async () => {
    setRunning(true)
    setSaveError('')
    try {
      const response = await editorService.rejectSubmission(code, {
        reason: currentReason,
        feedback: currentFeedback.trim(),
        internalNote: note.trim() || null,
        applyPenalty: penalize,
      })
      setConfirming(false)
      setData(response.data)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="desk-detail">
      {back}

      <div className="review-grid">
        {/* ===== Cột trái: tóm tắt hồ sơ (.applicant dính khi cuộn, editor.css) ===== */}
        <aside className="admin-panel applicant">
          <div className="detail-head__top">
            <span className="data-table__mono">{submission.trackingCode}</span>
            <Badge tone={status?.tone}>{status?.label ?? submission.status}</Badge>
          </div>
          <h2 className="reject-title">{submission.title}</h2>

          <dl className="applicant__facts">
            {category && (
              <div>
                <dt>
                  <Icon name={category.icon} size={14} />
                  Loại
                </dt>
                <dd>{category.label}</dd>
              </div>
            )}
            <div>
              <dt>
                <Icon name="clock" size={14} />
                Gửi lúc
              </dt>
              <dd>{formatDateTime(submission.createdAt)}</dd>
            </div>
            <div>
              <dt>
                <Icon name="mapPin" size={14} />
                Địa điểm
              </dt>
              <dd>{[submission.address, submission.province].filter(Boolean).join(', ')}</dd>
            </div>
            <div>
              <dt>
                <Icon name={reporter ? 'user' : 'eyeOff'} size={14} />
                Người gửi
              </dt>
              <dd>
                {reporter
                  ? `${reporter.fullName} · ${ROLE_LABELS[reporter.role] ?? reporter.role} · Uy tín ${reporter.reputationScore}`
                  : 'Ẩn danh'}
              </dd>
            </div>
          </dl>

          <div className="applicant__stats">
            <div>
              <strong className={screening.spamScore >= 50 ? 'is-danger' : ''}>{screening.spamScore ?? '–'}</strong>
              <span>Nghi vấn tin rác</span>
            </div>
            <div>
              <strong className={screening.credibilityScore < 30 ? 'is-danger' : ''}>{screening.credibilityScore ?? '–'}</strong>
              <span>Độ tin cậy</span>
            </div>
            <div>
              <strong>{submission.evidences.length}</strong>
              <span>Tệp đính kèm</span>
            </div>
          </div>

          {screening.suggestedReason && (
            <Alert type="warning" title={`AI gợi ý: ${REJECT_REASON_BY_VALUE[screening.suggestedReason]?.label.toLowerCase()}`}>
              {screening.aiReason}
              {reporter?.rejectedCount > 0 && ` Người gửi đã bị từ chối ${reporter.rejectedCount} hồ sơ trước đây.`}
            </Alert>
          )}

          <Button to={`/editor/queue/${code}`} variant="secondary" className="btn--sm">
            <Icon name="fileText" size={14} />
            Xem đầy đủ hồ sơ
          </Button>
        </aside>

        <div className="admin-stack">
          {/* ===== Nội dung người gửi (để đối chiếu khi viết phản hồi) ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Nội dung người gửi</h2>
              {submission.incidentAt && <span>Xảy ra lúc {formatDateTime(submission.incidentAt)}</span>}
            </div>
            <p className="detail-content">{submission.content}</p>
            <EvidenceList evidences={submission.evidences} />
            {screening.aiSummary && (
              <Alert type="info" title="Tóm tắt của AI">
                {screening.aiSummary}
              </Alert>
            )}
          </section>

          {/* ===== Form từ chối (khung .review-box giống trang xét đơn CTV) ===== */}
          <section className="admin-panel review-box">
            <div className="admin-panel__header">
              <h2>Lý do từ chối</h2>
              <span>Người gửi sẽ thấy lý do và phản hồi</span>
            </div>

            {submitted && hasError && (
              <Alert type="error" title="Chưa thể từ chối hồ sơ">
                Vui lòng kiểm tra các mục báo đỏ bên dưới: lý do là bắt buộc, phản hồi gửi người gửi từ {REJECT_LIMITS.feedbackMin} đến{' '}
                {REJECT_LIMITS.feedbackMax} ký tự.
              </Alert>
            )}

            <div className={`field reject-reasons ${shown.reason ? 'field--error' : ''}`}>
              <span className="field__label">
                Lý do<span className="field__required" aria-hidden="true">*</span>
              </span>
              <div className="role-options" role="radiogroup" aria-label="Lý do từ chối">
                {REJECT_REASONS.map((item) => (
                  <label key={item.value} className={`role-option ${currentReason === item.value ? 'is-selected' : ''}`}>
                    <input type="radio" name="reason" checked={currentReason === item.value} onChange={() => chooseReason(item.value)} />
                    <span>
                      <strong>
                        {item.label}
                        {item.value === screening.suggestedReason && <em> · AI gợi ý</em>}
                      </strong>
                      <small>{item.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
              {shown.reason && (
                <p className="field__error" role="alert">
                  <Icon name="alertCircle" size={14} />
                  {shown.reason}
                </p>
              )}
            </div>

            <TextField
              label="Phản hồi gửi người gửi"
              required
              multiline
              rows={5}
              counter={REJECT_LIMITS.feedbackMax}
              placeholder="Giải thích ngắn gọn, lịch sự vì sao hồ sơ chưa được tiếp nhận và người gửi có thể làm gì."
              hint="Gợi ý sẵn theo lý do, bạn có thể sửa. Người gửi đọc được trong email và trang theo dõi hồ sơ."
              value={currentFeedback}
              onChange={(event) => setFeedback(event.target.value)}
              error={shown.feedback}
            />

            <TextField
              label="Ghi chú nội bộ"
              multiline
              rows={2}
              counter={REJECT_LIMITS.noteMax}
              placeholder="Chỉ toà soạn thấy, lưu vào lịch sử thẩm định."
              hint="Không bắt buộc. Người gửi không thấy."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              error={shown.note}
            />

            {canPenalize && (
              <div className="reject-penalty">
                <Checkbox
                  checked={applyPenalty}
                  onChange={(event) => setApplyPenalty(event.target.checked)}
                  label={
                    <>
                      <b>Trừ {penaltyPoints} điểm uy tín của người gửi</b> ({reporter.reputationScore} →{' '}
                      {Math.max(0, reporter.reputationScore - penaltyPoints)}).
                      {reporter.rejectedCount > 0 && ` Người gửi đã bị từ chối ${reporter.rejectedCount} hồ sơ trước đây.`}
                    </>
                  }
                />
              </div>
            )}

            {/* Xem trước những gì người gửi nhận được */}
            <div className="reject-preview">
              <span className="reject-preview__label">
                <Icon name="mail" size={14} />
                Người gửi sẽ nhận được
              </span>
              <strong>Hồ sơ {submission.trackingCode} chưa được tiếp nhận</strong>
              <span>
                Lý do: <b>{REJECT_REASON_BY_VALUE[currentReason]?.label ?? '–'}</b>
              </span>
              <p>{currentFeedback.trim() || '–'}</p>
            </div>

            <div className="review-box__actions">
              <Button variant="ghost" to={`/editor/queue/${code}`}>
                Huỷ
              </Button>
              <Button variant="danger" onClick={askConfirm}>
                <Icon name="x" size={16} />
                Từ chối hồ sơ
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* ===== Hộp xác nhận ===== */}
      <Modal open={confirming} title="Từ chối hồ sơ này?" onClose={() => !running && setConfirming(false)}>
        <p className="modal__text">
          Hồ sơ <strong>{submission.trackingCode}</strong> sẽ chuyển sang "Không tiếp nhận" và không xử lý tiếp.{' '}
          {reporter ? 'Người gửi nhận email kèm phản hồi của bạn.' : 'Người gửi ẩn danh xem được phản hồi khi tra cứu hồ sơ.'} Thao
          tác này không hoàn tác được.
        </p>
        <dl className="credential-box reject-summary">
          <dt>Lý do</dt>
          <dd>{REJECT_REASON_BY_VALUE[currentReason]?.label}</dd>
          <dt>Uy tín</dt>
          <dd>{penalize ? `Trừ ${penaltyPoints} điểm (${reporter.reputationScore} → ${Math.max(0, reporter.reputationScore - penaltyPoints)})` : 'Không trừ điểm'}</dd>
        </dl>
        <Alert type="error">{saveError}</Alert>
        <div className="modal__actions">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={running}>
            Xem lại
          </Button>
          <Button variant="danger" loading={running} onClick={reject}>
            {!running && <Icon name="x" size={16} />}
            Xác nhận từ chối
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default EditorRejectSubmission
