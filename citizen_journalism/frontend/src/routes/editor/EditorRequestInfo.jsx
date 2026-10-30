import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import RequestNoteCard from '../../components/submission/RequestNoteCard'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EvidenceList from '../../components/submission/EvidenceList'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import ResultView from '../../components/ui/ResultView'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import {
  DEFAULT_REQUEST_MESSAGE,
  QUICK_ITEMS,
  REQUEST_INFO_LIMITS,
  buildRequestNote,
  validateInfoRequest,
} from '../../lib/requestInfo'
import { ROLE_LABELS } from '../../lib/roles'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import { infoRequestService } from '../../services/infoRequestService'
import '../../assets/styles/request-info.css'
import '../../assets/styles/submit.css' // Danh sách tệp (.evidence-list)
import '../../assets/styles/tracking.css' // Đầu hồ sơ, nội dung (.detail-head__*, .detail-content)

/*
 * YÊU CẦU BỔ SUNG THÔNG TIN (Request Additional Information, Biên tập viên) — /editor/queue/:code/request-info.
 * Mở từ nút "Yêu cầu bổ sung" ở chi tiết hồ sơ (EditorSubmissionDetail). Biên tập viên chọn các mục người gửi cần bổ sung
 * (chip gợi ý hoặc tự viết), viết lời nhắn, xem trước đúng hộp người gửi sẽ thấy, xác nhận rồi hồ sơ chuyển sang "Cần bổ sung".
 * Người gửi trả lời ở trang Bổ sung thông tin (routes/SupplementSubmission.jsx), xong thì hồ sơ quay về "Đang thẩm định".
 *
 * API (backend: EditorController -> SubmissionInfoRequestService):
 *   GET  /api/editor/submissions/{mã}/info-request -> { submission, reporter, requestable, request }
 *        submission  : SubmissionDetail (như GET /api/editor/submissions/{mã}); có requestNote khi đang "Cần bổ sung"
 *        reporter    : null nếu gửi ẩn danh | { fullName, role, reputationScore, email (đã che bớt) }
 *        requestable : hồ sơ đang Đã tiếp nhận / Đang thẩm định (PENDING / IN_REVIEW)
 *        request     : null | yêu cầu đang chờ (khi NEED_MORE_INFO) { note, requestedAt, reviewerName, internalNote }
 *   POST /api/editor/submissions/{mã}/request-info { message, items, internalNote } -> dữ liệu mới (cùng dạng GET)
 *   Cách lưu vào DB: xem chú thích đầu lib/requestInfo.js.
 *
 * TRẠNG THÁI MÀN HÌNH: form yêu cầu | hộp xác nhận | đã gửi | đang chờ người gửi bổ sung | không thể yêu cầu.
 */

function EditorRequestInfo() {
  const { code } = useParams()
  const { data, error, setData } = useAsyncData(() => infoRequestService.getInfoRequest(code), code)
  // Mỗi mục: { id, key (mã chip, '' nếu tự viết), text }. id chỉ để React phân biệt các ô khi thêm / bỏ.
  const [items, setItems] = useState([])
  const nextId = useRef(1)
  const [message, setMessage] = useState(DEFAULT_REQUEST_MESSAGE)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false) // Đã bấm "Gửi" ít nhất 1 lần -> bắt đầu hiện lỗi
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [sent, setSent] = useState(false) // Vừa gửi xong trong phiên này -> hiện màn "Đã gửi"

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

  const { submission, reporter, requestable, request } = data
  const status = SUBMISSION_STATUS[submission.status]
  const category = CATEGORY_BY_VALUE[submission.category]
  const notifyText = reporter
    ? `Email tới ${reporter.email}`
    : 'Người gửi ẩn danh, xem được trong tài khoản hoặc khi tra cứu bằng mã hồ sơ + PIN'

  // ===== Vừa gửi xong =====
  if (sent && request) {
    return (
      <div className="desk-detail">
        {back}
        <section className="admin-panel">
          <div className="info-request-result">
            <ResultView
              text={`Đã gửi yêu cầu bổ sung cho hồ sơ ${submission.trackingCode}. Hồ sơ chuyển sang "Cần bổ sung" và chờ người gửi phản hồi; khi người gửi bổ sung xong, hồ sơ quay lại hàng đợi.`}
            >
              <dl className="credential-box info-request-summary">
                <dt>Số mục</dt>
                <dd>{items.length} mục cần bổ sung</dd>
                <dt>Thông báo</dt>
                <dd>{notifyText}</dd>
                <dt>Lưu lúc</dt>
                <dd>
                  {formatDateTime(request.requestedAt)}
                  {request.reviewerName && ` · BTV ${request.reviewerName}`}
                </dd>
              </dl>
              <Button to="/editor/queue">Về hàng đợi tin bài</Button>
              <Button to={`/editor/queue/${code}`} variant="secondary">
                Về chi tiết hồ sơ
              </Button>
            </ResultView>
          </div>
        </section>
      </div>
    )
  }

  /** Cột trái: tóm tắt hồ sơ (.applicant dính khi cuộn, editor.css). extra: phần thêm ở cuối cột. */
  const summary = (facts, extra) => (
    <aside className="admin-panel applicant">
      <div className="detail-head__top">
        <span className="data-table__mono">{submission.trackingCode}</span>
        <Badge tone={status?.tone}>{status?.label ?? submission.status}</Badge>
      </div>
      <h2 className="info-request-title">{submission.title}</h2>
      <dl className="applicant__facts">{facts}</dl>
      {extra}
      <Button to={`/editor/queue/${code}`} variant="secondary" className="btn--sm">
        <Icon name="fileText" size={14} />
        Xem đầy đủ hồ sơ
      </Button>
    </aside>
  )

  const fact = (icon, label, value) => (
    <div>
      <dt>
        <Icon name={icon} size={14} />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  )

  // ===== Đang chờ người gửi bổ sung (đã yêu cầu trước đó) =====
  if (request) {
    return (
      <div className="desk-detail">
        {back}
        <div className="review-grid">
          {summary(
            <>
              {fact('send', 'Đã yêu cầu', `${formatDateTime(request.requestedAt)}${request.reviewerName ? ` · BTV ${request.reviewerName}` : ''}`)}
              {fact('mail', 'Thông báo', notifyText)}
              {request.internalNote && fact('edit', 'Ghi chú nội bộ', request.internalNote)}
            </>,
          )}
          <div className="admin-stack">
            <section className="admin-panel">
              <div className="admin-panel__header">
                <h2>Yêu cầu đang chờ người gửi</h2>
                <span>Người gửi chưa phản hồi</span>
              </div>
              <Alert type="info">
                Khi người gửi bổ sung, hồ sơ tự quay về "Đang thẩm định" và nội dung bổ sung hiện trong nhật ký hồ sơ. Trong lúc chờ,
                bạn vẫn có thể từ chối nếu hồ sơ không còn giá trị.
              </Alert>
              <RequestNoteCard note={request.note} from={{ actor: 'EDITOR', createdAt: request.requestedAt }} />
              <div className="review-box__actions">
                <Button variant="ghost" to="/editor/queue">
                  Về hàng đợi
                </Button>
                <Button variant="secondary" to={`/editor/queue/${code}`}>
                  Về chi tiết hồ sơ
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  // ===== Hồ sơ không ở bước tiếp nhận / thẩm định =====
  if (!requestable) {
    return (
      <div className="desk-detail">
        {back}
        <section className="admin-panel">
          <div className="info-request-result">
            <ResultView
              tone="muted"
              text={`Không thể yêu cầu bổ sung cho hồ sơ ${submission.trackingCode} vì hồ sơ đang ở trạng thái "${status?.label ?? submission.status}". Biên tập viên chỉ yêu cầu bổ sung được với hồ sơ Đã tiếp nhận hoặc Đang thẩm định.`}
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

  // ===== Form yêu cầu bổ sung =====
  const texts = items.map((item) => item.text)
  const errors = validateInfoRequest({ items: texts, message, note })
  const hasError = Boolean(errors.items || errors.message || errors.note || errors.itemErrors.some(Boolean))
  const shown = submitted ? errors : { itemErrors: [] }
  const usedKeys = items.map((item) => item.key)
  const full = items.length >= REQUEST_INFO_LIMITS.maxItems
  const preview = buildRequestNote(message, texts.filter((text) => text.trim()))
  const videoCount = submission.evidences.filter((evidence) => evidence.fileType === 'VIDEO').length

  const addItem = (key = '', text = '') => {
    if (full) return
    setItems((list) => [...list, { id: nextId.current++, key, text }])
  }

  /** Chip "Thêm nhanh": chưa có thì thêm mục với câu mẫu, có rồi thì bỏ mục đó. */
  const toggleQuick = (quick) => {
    if (usedKeys.includes(quick.key)) setItems((list) => list.filter((item) => item.key !== quick.key))
    else addItem(quick.key, quick.text)
  }

  const updateItem = (id, text) => setItems((list) => list.map((item) => (item.id === id ? { ...item, text } : item)))
  const removeItem = (id) => setItems((list) => list.filter((item) => item.id !== id))

  const askConfirm = () => {
    setSubmitted(true)
    if (hasError) return
    setSaveError('')
    setConfirming(true)
  }

  const send = async () => {
    setRunning(true)
    setSaveError('')
    try {
      const response = await infoRequestService.requestInfo(code, {
        message: message.trim() || null,
        items: texts.map((text) => text.trim()),
        internalNote: note.trim() || null,
      })
      setConfirming(false)
      setData(response.data)
      setSent(true)
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
        {summary(
          <>
            {category && fact(category.icon, 'Loại', category.label)}
            {fact('clock', 'Gửi lúc', formatDateTime(submission.createdAt))}
            {fact('mapPin', 'Địa điểm', [submission.address, submission.province].filter(Boolean).join(', '))}
            {fact(
              reporter ? 'user' : 'eyeOff',
              'Người gửi',
              reporter ? `${reporter.fullName} · ${ROLE_LABELS[reporter.role] ?? reporter.role} · Uy tín ${reporter.reputationScore}` : 'Ẩn danh',
            )}
          </>,
          // Hồ sơ hiện có gì (từ dữ liệu thật), giúp BTV chọn mục cần hỏi
          <div className="applicant__stats">
            <div>
              <strong>{submission.evidences.length}</strong>
              <span>Tệp đính kèm</span>
            </div>
            <div>
              <strong>{videoCount}</strong>
              <span>Video</span>
            </div>
            <div>
              <strong>{reporter ? 'Có' : 'Ẩn danh'}</strong>
              <span>Liên hệ</span>
            </div>
          </div>,
        )}

        <div className="admin-stack">
          {/* ===== Nội dung người gửi (để đối chiếu khi chọn mục cần hỏi) ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Nội dung người gửi</h2>
              {submission.incidentAt && <span>Xảy ra lúc {formatDateTime(submission.incidentAt)}</span>}
            </div>
            <p className="detail-content">{submission.content}</p>
            <EvidenceList evidences={submission.evidences} />
          </section>

          {/* ===== Form yêu cầu bổ sung (khung .review-box giống trang xét đơn CTV) ===== */}
          <section className="admin-panel review-box">
            <div className="admin-panel__header">
              <h2>Nội dung cần bổ sung</h2>
              <span>Người gửi sẽ thấy đúng như phần xem trước</span>
            </div>

            {submitted && hasError && (
              <Alert type="error" title="Chưa thể gửi yêu cầu">
                Vui lòng thêm ít nhất 1 mục cần bổ sung, mỗi mục từ {REQUEST_INFO_LIMITS.itemMin} đến {REQUEST_INFO_LIMITS.itemMax} ký tự.
              </Alert>
            )}

            <div className="field">
              <span className="field__label">Thêm nhanh</span>
              <div className="chip-select">
                {QUICK_ITEMS.map((quick) => {
                  const selected = usedKeys.includes(quick.key)
                  return (
                    <button
                      key={quick.key}
                      type="button"
                      className={`chip ${selected ? 'is-selected' : ''}`}
                      aria-pressed={selected}
                      disabled={!selected && full}
                      onClick={() => toggleQuick(quick)}
                    >
                      <Icon name={quick.icon} size={14} />
                      {quick.label}
                    </button>
                  )
                })}
              </div>
              <p className="field__hint">Bấm chip để thêm mục với câu mẫu, bấm lại để bỏ. Dùng được cho Người dân, Cộng tác viên và Chuyên gia.</p>
            </div>

            <div className={`field ${shown.items ? 'field--error' : ''}`}>
              <span className="field__label">
                Các mục cần bổ sung<span className="field__required" aria-hidden="true">*</span>
              </span>
              {items.length === 0 ? (
                <p className="info-items__empty">Chưa có mục nào. Bấm chip "Thêm nhanh" hoặc "Thêm mục khác".</p>
              ) : (
                <ol className="info-items">
                  {items.map((item, index) => (
                    <li key={item.id} className={`info-item ${shown.itemErrors[index] ? 'is-invalid' : ''}`}>
                      <span className="info-item__num">{index + 1}</span>
                      <div>
                        <textarea
                          className="field__input field__textarea"
                          rows={2}
                          aria-label={`Mục ${index + 1}`}
                          aria-invalid={Boolean(shown.itemErrors[index])}
                          placeholder="Ví dụ: Ảnh chụp rõ biển số nhà gần nơi xảy ra sự việc."
                          value={item.text}
                          onChange={(event) => updateItem(item.id, event.target.value)}
                        />
                        {shown.itemErrors[index] && (
                          <p className="field__error" role="alert">
                            <Icon name="alertCircle" size={14} />
                            {shown.itemErrors[index]}
                          </p>
                        )}
                      </div>
                      <button type="button" className="info-item__remove" aria-label={`Bỏ mục ${index + 1}`} title="Bỏ mục" onClick={() => removeItem(item.id)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="info-items__foot">
                <Button variant="ghost" className="btn--sm" disabled={full} onClick={() => addItem()}>
                  <Icon name="plus" size={14} />
                  Thêm mục khác
                </Button>
                <span className="field__counter">
                  {items.length}/{REQUEST_INFO_LIMITS.maxItems} mục
                </span>
              </div>
              {shown.items && (
                <p className="field__error" role="alert">
                  <Icon name="alertCircle" size={14} />
                  {shown.items}
                </p>
              )}
            </div>

            <TextField
              label="Lời nhắn gửi người gửi"
              multiline
              rows={3}
              counter={REQUEST_INFO_LIMITS.messageMax}
              placeholder="Câu mở đầu trước danh sách mục, ví dụ lời cảm ơn và lý do cần bổ sung."
              hint="Không bắt buộc. Hiện phía trên danh sách mục trong email và trang Bổ sung thông tin."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              error={shown.message}
            />

            <TextField
              label="Ghi chú nội bộ"
              multiline
              rows={2}
              counter={REQUEST_INFO_LIMITS.noteMax}
              placeholder="Chỉ toà soạn thấy, lưu vào lịch sử thẩm định."
              hint="Không bắt buộc. Người gửi không thấy."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              error={shown.note}
            />

            {/* Xem trước: đúng hộp RequestNoteCard người gửi sẽ thấy */}
            <div className="info-preview">
              <span className="info-preview__label">
                <Icon name="eye" size={14} />
                Người gửi sẽ thấy
              </span>
              <RequestNoteCard note={preview} from={{ actor: 'EDITOR', createdAt: new Date() }} />
            </div>

            <div className="review-box__actions">
              <Button variant="ghost" to={`/editor/queue/${code}`}>
                Huỷ
              </Button>
              <Button onClick={askConfirm}>
                <Icon name="send" size={16} />
                Gửi yêu cầu bổ sung
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* ===== Hộp xác nhận ===== */}
      <Modal open={confirming} title="Gửi yêu cầu bổ sung?" onClose={() => !running && setConfirming(false)}>
        <p className="modal__text">
          Hồ sơ <strong>{submission.trackingCode}</strong> sẽ chuyển sang "Cần bổ sung" và tạm rời hàng đợi cho đến khi người gửi phản hồi.{' '}
          {reporter ? 'Người gửi nhận email kèm danh sách mục cần bổ sung.' : 'Người gửi ẩn danh xem được yêu cầu trong tài khoản hoặc khi tra cứu hồ sơ.'}
        </p>
        <dl className="credential-box info-request-summary">
          <dt>Số mục</dt>
          <dd>{items.length} mục cần bổ sung</dd>
          <dt>Gửi tới</dt>
          <dd>{reporter ? `${reporter.fullName} · ${reporter.email}` : 'Người gửi ẩn danh'}</dd>
        </dl>
        <Alert type="error">{saveError}</Alert>
        <div className="modal__actions">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={running}>
            Xem lại
          </Button>
          <Button loading={running} onClick={send}>
            {!running && <Icon name="send" size={16} />}
            Xác nhận gửi
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default EditorRequestInfo
