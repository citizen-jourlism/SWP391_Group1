import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EvidenceList from '../../components/submission/EvidenceList'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import ResultView from '../../components/ui/ResultView'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { ROLE_LABELS } from '../../lib/roles'
import { CATEGORY_BY_VALUE, FILE_TYPE_INFO, SUBMISSION_STATUS } from '../../lib/submission'
import {
  ASSIGNMENT_MODE,
  ASSIGNMENT_STATUS,
  PRIORITY_LABELS,
  REVIEW_CRITERIA,
  VERIFICATION_REVIEW_LIMITS,
  formatGps,
  validateVerificationReview,
} from '../../lib/verificationReview'
import { verificationReviewService } from '../../services/verificationReviewService'
import '../../assets/styles/verification-review.css'
import '../../assets/styles/submit.css' // Danh sách tệp (.evidence-list)
import '../../assets/styles/tracking.css' // Đầu hồ sơ, nội dung (.detail-head__*, .detail-content)

/*
 * DUYỆT KẾT QUẢ XÁC MINH (Review Verification Result, Biên tập viên) — /editor/queue/:code/verification.
 * Mở từ nút "Duyệt kết quả xác minh" ở chi tiết hồ sơ (EditorSubmissionDetail), dùng SAU KHI Cộng tác viên đã xác minh
 * thực địa và nộp bài + báo cáo. Trên 1 màn, Biên tập viên đối chiếu:
 *   1. Bài & báo cáo của CTV (thông tin nhiệm vụ, nội dung bài, tệp kèm GPS / giờ chụp nếu có)
 *   2. Tin gốc của người gửi
 *   3. Kết quả sàng lọc tự động (tin rác, tin trùng, tóm tắt)
 *   4. Kết luận: 5 tiêu chí Đạt / Chưa đạt + ghi chú gửi Phó Tổng biên tập
 * Tất cả Đạt -> hộp xác nhận -> hồ sơ chuyển "Chờ Phó TBT duyệt". Có tiêu chí Chưa đạt -> không lưu, hiện nút sang
 * Yêu cầu bổ sung / Từ chối (các màn đã có).
 *
 * API (backend: EditorController -> SubmissionVerificationReviewService):
 *   GET  /api/editor/submissions/{mã}/verification-review -> xem chú thích services/verificationReviewService.js
 *   POST /api/editor/submissions/{mã}/verification-review { checks, note } -> dữ liệu mới (cùng dạng GET)
 *
 * TRẠNG THÁI MÀN HÌNH: đang duyệt | hộp xác nhận | đã chuyển Phó TBT | chưa thể duyệt (chưa xác minh xong / sai trạng thái).
 */

/** Trạng thái rỗng của 5 tiêu chí: value '' = chưa đánh giá, 'PASS' = Đạt, 'FAIL' = Chưa đạt. */
const emptyResults = () => Object.fromEntries(REVIEW_CRITERIA.map((item) => [item.key, { value: '', issue: '' }]))

function EditorVerificationReview() {
  const { code } = useParams()
  const { data, error, setData, reload } = useAsyncData(() => verificationReviewService.getReview(code), code)
  const [results, setResults] = useState(emptyResults)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false) // Đã bấm chuyển ít nhất 1 lần -> bắt đầu hiện lỗi
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pageError, setPageError] = useState('') // Lỗi 409: hồ sơ vừa đổi trạng thái trong lúc duyệt

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

  const { submission, assignment, report, screening, review, reporter } = data
  const status = SUBMISSION_STATUS[submission.status]

  // ===== Đã duyệt (vừa xong hoặc mở lại sau đó) =====
  if (review && submission.status === 'DEPUTY_PENDING') {
    return (
      <div className="desk-detail vr-page">
        {back}
        <section className="admin-panel">
          <div className="vr-result">
            <ResultView
              text={`Hồ sơ ${submission.trackingCode} đã đạt khi duyệt kết quả xác minh và chuyển sang "Chờ Phó TBT duyệt". Kết quả từng tiêu chí được lưu vào lịch sử thẩm định để Phó Tổng biên tập xem lại.`}
            >
              <dl className="credential-box vr-saved">
                <dt>Chuyển tới</dt>
                <dd>{data.deputyName ? `Phó TBT ${data.deputyName}` : 'Phó Tổng biên tập'}{data.categoryName && ` · ${data.categoryName}`}</dd>
                <dt>Lưu lúc</dt>
                <dd>
                  {formatDateTime(review.reviewedAt)}
                  {review.reviewerName && ` · BTV ${review.reviewerName}`}
                </dd>
                <dt>Kết quả</dt>
                <dd className="vr-saved__comments">{review.comments}</dd>
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

  // ===== Chưa thể duyệt: hồ sơ không ở bước thẩm định, hoặc CTV chưa nộp bài =====
  if (!data.reviewable) {
    const assignmentStatus = assignment && ASSIGNMENT_STATUS[assignment.status]
    return (
      <div className="desk-detail vr-page">
        {back}
        <section className="admin-panel">
          <div className="vr-result">
            <ResultView tone="muted" text={`Chưa thể duyệt kết quả xác minh hồ sơ ${submission.trackingCode}. ${data.blockedReason}`}>
              <dl className="credential-box vr-saved">
                <dt>Hồ sơ</dt>
                <dd>{status?.label ?? submission.status}</dd>
                <dt>Nhiệm vụ</dt>
                <dd>
                  {assignment
                    ? `${assignmentStatus?.label ?? assignment.status}${assignment.contributorName ? ` · CTV ${assignment.contributorName}` : ''}${assignment.deadline ? ` · hạn ${formatDateTime(assignment.deadline)}` : ''}`
                    : 'Chưa giao CTV xác minh'}
                </dd>
              </dl>
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

  // ===== Màn duyệt =====
  const errors = validateVerificationReview(results, note)
  const answered = REVIEW_CRITERIA.length - errors.missing.length
  const failedCount = errors.failed.length
  const allPassed = answered === REVIEW_CRITERIA.length && failedCount === 0
  const warnings = (screening.spam ? 1 : 0) + (screening.duplicateOf ? 1 : 0)
  const priority = PRIORITY_LABELS[data.priority]
  const category = CATEGORY_BY_VALUE[submission.category]
  const deputy = data.deputyName ? `Phó TBT ${data.deputyName}` : 'Phó Tổng biên tập'

  const setValue = (key, value) =>
    setResults((current) => ({ ...current, [key]: { ...current[key], value: current[key].value === value ? '' : value } }))
  const setIssue = (key, issue) => setResults((current) => ({ ...current, [key]: { ...current[key], issue } }))

  const askConfirm = () => {
    setSubmitted(true)
    if (!allPassed || errors.note) return
    setSaveError('')
    setConfirming(true)
  }

  const send = async () => {
    setRunning(true)
    setSaveError('')
    try {
      const response = await verificationReviewService.submitReview(code, {
        checks: REVIEW_CRITERIA.map(({ key }) => ({ criterion: key, passed: true })),
        note: note.trim() || null,
      })
      setConfirming(false)
      setData(response.data)
      window.scrollTo({ top: 0 })
    } catch (err) {
      if (err.status === 409) {
        // Hồ sơ đã đổi trạng thái (BTV khác đã xử lý...): đóng hộp thoại, báo lỗi đầu trang và tải lại
        setConfirming(false)
        setPageError(err.message)
        reload()
      } else setSaveError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const fact = (icon, label, value) => (
    <div>
      <dt>
        <Icon name={icon} size={14} />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  )

  return (
    <div className="desk-detail vr-page">
      {back}
      <Alert type="error">{pageError}</Alert>

      <div className="review-grid">
        {/* ===== Cột trái: tóm tắt hồ sơ + tiến độ duyệt ===== */}
        <aside className="admin-panel applicant">
          <div className="detail-head__top">
            <span className="data-table__mono">{submission.trackingCode}</span>
            <Badge tone={status?.tone}>{status?.label ?? submission.status}</Badge>
          </div>
          <h2 className="vr-title">{submission.title}</h2>
          <dl className="applicant__facts">
            {category && fact(category.icon, 'Loại', category.label)}
            {data.categoryName && fact('flag', 'Chuyên mục', data.categoryName)}
            {(priority || data.impactScore != null) &&
              fact(
                'zap',
                'Mức ưu tiên',
                <>
                  {priority && <Badge tone={priority.tone}>{priority.label}</Badge>}
                  {data.impactScore != null && ` · Điểm tác động ${data.impactScore}`}
                </>,
              )}
            {fact('mapPin', 'Địa điểm', [submission.address, submission.province].filter(Boolean).join(', ') || 'Không ghi')}
            {fact(
              reporter ? 'user' : 'eyeOff',
              'Người gửi',
              reporter ? `${reporter.fullName} · ${ROLE_LABELS[reporter.role] ?? reporter.role} · Uy tín ${reporter.reputationScore}` : 'Ẩn danh',
            )}
            {fact(
              'mapPin',
              'Xác minh',
              <>
                CTV {assignment.contributorName ?? '—'} · <span className="vr-ok">Hoàn thành</span>
              </>,
            )}
            {fact('shield', 'Chuyển tới', data.categoryName ? `${deputy} (phụ trách ${data.categoryName})` : deputy)}
          </dl>

          <div className={`vr-progress ${allPassed ? 'is-pass' : ''} ${failedCount ? 'is-fail' : ''}`}>
            <div className="vr-progress__top">
              <span>Tiến độ duyệt</span>
              <strong>
                {answered}/{REVIEW_CRITERIA.length} tiêu chí
              </strong>
            </div>
            <div className="vr-progress__bar">
              <span style={{ width: `${(answered / REVIEW_CRITERIA.length) * 100}%` }} />
            </div>
          </div>

          <div className="applicant__stats">
            <div>
              <strong>{report.evidences.length}</strong>
              <span>Tệp CTV</span>
            </div>
            <div>
              <strong>{submission.evidences.length}</strong>
              <span>Tệp người gửi</span>
            </div>
            <div>
              <strong>{warnings}</strong>
              <span>Cảnh báo</span>
            </div>
          </div>

          <div className="vr-links">
            <Button to={`/editor/queue/${code}`} variant="secondary" className="btn--sm">
              <Icon name="fileText" size={14} />
              Xem đầy đủ hồ sơ
            </Button>
          </div>
        </aside>

        <div className="admin-stack">
          {/* ===== 1. Bài & báo cáo của CTV ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>
                <span className="vr-step">1</span>Bài &amp; báo cáo xác minh của CTV
              </h2>
              {assignment.submittedAt && <span>Nộp {formatDateTime(assignment.submittedAt)}</span>}
            </div>
            <div className="vr-report">
              <div className="vr-report__head">
                <Avatar name={assignment.contributorName ?? 'CTV'} size={40} />
                <div>
                  <strong>{assignment.contributorName ?? 'Chưa rõ CTV'}</strong>
                  <small>
                    Cộng tác viên{assignment.contributorId && ` · ${assignment.contributorId}`}
                    {assignment.contributorReputation != null && ` · Uy tín ${assignment.contributorReputation}`}
                  </small>
                </div>
                <Badge tone="green">Nhiệm vụ hoàn thành</Badge>
              </div>
              <dl className="vr-report__facts">
                <div>
                  <dt>Giao việc</dt>
                  <dd>
                    {ASSIGNMENT_MODE[assignment.mode] ?? assignment.mode} · {formatDateTime(assignment.assignedAt)}
                  </dd>
                </div>
                <div>
                  <dt>Hạn chót</dt>
                  <dd>{assignment.deadline ? formatDateTime(assignment.deadline) : 'Không đặt hạn'}</dd>
                </div>
                <div>
                  <dt>Nộp lúc</dt>
                  <dd>
                    {formatDateTime(assignment.submittedAt)}{' '}
                    {assignment.onTime === true && <span className="vr-ok">Đúng hạn</span>}
                    {assignment.onTime === false && <span className="vr-warn">Trễ hạn</span>}
                  </dd>
                </div>
              </dl>

              <div className="vr-article">
                <h3>{report.title}</h3>
                {report.summary && <p className="vr-article__sapo">{report.summary}</p>}
                <p className="detail-content">{report.content}</p>
              </div>

              {report.evidences.length === 0 ? (
                <p className="evidence-list__empty">CTV không nộp kèm tệp.</p>
              ) : (
                <ul className="evidence-list vr-gps-list">
                  {report.evidences.map((evidence) => {
                    const typeInfo = FILE_TYPE_INFO[evidence.fileType] ?? FILE_TYPE_INFO.DOCUMENT
                    const gps = formatGps(evidence)
                    const meta = [evidence.capturedAt && formatDateTime(evidence.capturedAt), evidence.device].filter(Boolean)
                    return (
                      <li key={evidence.url}>
                        <Icon name={typeInfo.icon} size={18} />
                        <span>
                          <a href={evidence.url} target="_blank" rel="noreferrer">
                            {evidence.fileName}
                          </a>
                          <small className={`vr-gps ${gps ? '' : 'vr-gps--warn'}`}>
                            <Icon name={gps ? 'mapPin' : 'alertCircle'} size={12} />
                            {[gps ?? 'Không có dữ liệu GPS', ...meta].join(' · ')}
                          </small>
                        </span>
                        {gps ? <span className="vr-ok">Có GPS</span> : <span className="vr-warn">Thiếu GPS</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* ===== 2. Tin gốc của người gửi ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>
                <span className="vr-step">2</span>Tin gốc của người gửi
              </h2>
              <span>
                Gửi {formatDateTime(submission.createdAt)} · {submission.evidences.length} tệp
              </span>
            </div>
            <p className="detail-content">{submission.content}</p>
            <EvidenceList evidences={submission.evidences} />
          </section>

          {/* ===== 3. Kết quả sàng lọc tự động ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>
                <span className="vr-step">3</span>Kết quả sàng lọc tự động
              </h2>
              <Link to={`/editor/screening/${code}`} className="vr-head-link">
                <Icon name="copy" size={14} />
                Kiểm tra tin trùng
              </Link>
            </div>
            <ul className="vr-flags">
              <li>
                <span className="vr-flags__label">Tin rác</span>
                <Badge tone={screening.spam ? 'red' : 'green'}>{screening.spam ? 'Có dấu hiệu' : 'Không'}</Badge>
                <small>
                  {screening.spam ? 'Hệ thống đánh dấu hồ sơ có dấu hiệu tin rác / quảng cáo.' : 'Hệ thống không phát hiện dấu hiệu tin rác / quảng cáo.'}
                </small>
              </li>
              <li>
                <span className="vr-flags__label">Tin trùng</span>
                <Badge tone={screening.duplicateOf ? 'orange' : 'green'}>{screening.duplicateOf ? 'Nghi trùng' : 'Không trùng'}</Badge>
                <small>
                  {screening.duplicateOf ? (
                    <>
                      Hệ thống phát hiện nội dung tương tự <Link to={`/editor/queue/${screening.duplicateOf}`}>{screening.duplicateOf}</Link>.
                    </>
                  ) : (
                    'Không có hồ sơ nào được đánh dấu trùng với hồ sơ này.'
                  )}
                </small>
              </li>
              <li className="vr-flags__wide">
                <span className="vr-flags__label">Tóm tắt nội dung</span>
                <p>{screening.summary || 'Chưa có tóm tắt.'}</p>
              </li>
            </ul>
          </section>

          {/* ===== 4. Kết luận ===== */}
          <section className="admin-panel review-box">
            <div className="admin-panel__header">
              <h2>
                <span className="vr-step">4</span>Kết luận duyệt
              </h2>
              <span>
                {failedCount > 0
                  ? `${failedCount} tiêu chí chưa đạt`
                  : allPassed
                    ? `${REVIEW_CRITERIA.length}/${REVIEW_CRITERIA.length} tiêu chí đạt`
                    : `${answered}/${REVIEW_CRITERIA.length} tiêu chí đã đánh giá`}
              </span>
            </div>

            {submitted && errors.missing.length > 0 && (
              <Alert type="error" title="Chưa thể chuyển hồ sơ">
                Còn {errors.missing.length} tiêu chí chưa đánh giá. Vui lòng đánh giá đủ {REVIEW_CRITERIA.length} tiêu chí.
              </Alert>
            )}

            <ol className="vr-checks">
              {REVIEW_CRITERIA.map((item) => {
                const result = results[item.key]
                const stateClass =
                  result.value === 'PASS' ? 'is-pass' : result.value === 'FAIL' ? 'is-fail' : submitted ? 'is-missing' : ''
                return (
                  <li key={item.key} className={`vr-check ${stateClass}`}>
                    <div className="vr-check__text">
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </div>
                    <div className="vr-seg" role="group" aria-label={item.label}>
                      <button
                        type="button"
                        className={result.value === 'PASS' ? 'is-active' : ''}
                        aria-pressed={result.value === 'PASS'}
                        onClick={() => setValue(item.key, 'PASS')}
                      >
                        Đạt
                      </button>
                      <button
                        type="button"
                        className={result.value === 'FAIL' ? 'is-active' : ''}
                        aria-pressed={result.value === 'FAIL'}
                        onClick={() => setValue(item.key, 'FAIL')}
                      >
                        Chưa đạt
                      </button>
                    </div>
                    {result.value === 'FAIL' && (
                      <div className="vr-check__issue">
                        <TextField
                          label={`Vấn đề cần xử lý (${item.label})`}
                          multiline
                          rows={2}
                          counter={VERIFICATION_REVIEW_LIMITS.issueMax}
                          placeholder="Ghi rõ vấn đề để xử lý ở bước tiếp theo."
                          value={result.issue}
                          onChange={(event) => setIssue(item.key, event.target.value)}
                          error={errors.issueErrors[item.key]}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            <TextField
              label="Ghi chú gửi Phó Tổng biên tập"
              multiline
              rows={3}
              counter={VERIFICATION_REVIEW_LIMITS.noteMax}
              placeholder="Không bắt buộc. Ví dụ: điểm cần lưu ý khi duyệt, đề xuất giờ đăng."
              hint="Chỉ toà soạn thấy, lưu vào lịch sử thẩm định. Người gửi không thấy."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              error={submitted ? errors.note : ''}
            />

            {failedCount > 0 && (
              <Alert type="warning" title="Hồ sơ chưa đạt">
                {failedCount} tiêu chí chưa đạt. Hãy yêu cầu bổ sung, hoặc từ chối nếu hồ sơ không thể sử dụng. Kết quả duyệt chưa đạt không được lưu.
              </Alert>
            )}

            <div className="review-box__actions">
              <Button variant="ghost" to={`/editor/queue/${code}`}>
                Huỷ
              </Button>
              {failedCount > 0 ? (
                <>
                  <Button variant="secondary" to={`/editor/queue/${code}/request-info`}>
                    <Icon name="info" size={16} />
                    Yêu cầu bổ sung
                  </Button>
                  <Button variant="danger" to={`/editor/queue/${code}/reject`}>
                    <Icon name="x" size={16} />
                    Từ chối
                  </Button>
                </>
              ) : (
                <Button onClick={askConfirm}>
                  <Icon name="send" size={16} />
                  Đạt · Chuyển Phó TBT
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ===== Hộp xác nhận ===== */}
      <Modal open={confirming} title="Chuyển hồ sơ lên Phó Tổng biên tập?" onClose={() => !running && setConfirming(false)}>
        <p className="modal__text">
          Hồ sơ <strong>{submission.trackingCode}</strong> sẽ chuyển sang "Chờ Phó TBT duyệt" và rời hàng đợi của bạn. Bài CTV, kết quả duyệt và
          ghi chú được gửi kèm để Phó Tổng biên tập xem.
        </p>
        <dl className="credential-box vr-confirm">
          <dt>Kết quả</dt>
          <dd>
            {REVIEW_CRITERIA.length}/{REVIEW_CRITERIA.length} tiêu chí đạt
          </dd>
          <dt>Chuyển tới</dt>
          <dd>
            {deputy}
            {data.categoryName && ` · ${data.categoryName}`}
          </dd>
          {priority && (
            <>
              <dt>Mức ưu tiên</dt>
              <dd>{priority.label}</dd>
            </>
          )}
        </dl>
        <Alert type="error">{saveError}</Alert>
        <div className="modal__actions">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={running}>
            Xem lại
          </Button>
          <Button loading={running} onClick={send}>
            {!running && <Icon name="send" size={16} />}
            Xác nhận chuyển
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default EditorVerificationReview
