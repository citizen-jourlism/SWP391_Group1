import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatCard from '../../components/admin/StatCard'
import DuplicateSide from '../../components/editor/DuplicateSide'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import ResultView from '../../components/ui/ResultView'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { matchSignals, similarityLegend, similarityLevel } from '../../lib/screening'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import { editorService } from '../../services/editorService'
import '../../assets/styles/contributor.css' // Hàng nhãn tín hiệu (.app-facts__tags)
import '../../assets/styles/screening.css'
import '../../assets/styles/submit.css' // Danh sách tệp (.evidence-list)
import '../../assets/styles/tracking.css' // Đầu hồ sơ, thông tin, nội dung (.detail-head__*, .detail-facts, .detail-content)

/*
 * KIỂM TRA TIN TRÙNG (UC Editor #05 "Check for Duplication") — /editor/screening/:code.
 * Mở từ nút "Kiểm tra tin trùng" ở chi tiết hồ sơ (EditorSubmissionDetail). Biên tập viên xem kết quả AI quét hồ sơ
 * (điểm tin rác, độ tin cậy, tóm tắt) và các hồ sơ AI cho là tương tự, so sánh từng cặp rồi kết luận.
 *
 * API (backend CHƯA có, xem services/editorService.js):
 *   GET  /api/editor/submissions/{mã}/duplicates          -> { submission, screening, candidates, review }
 *        submission : như GET /api/editor/submissions/{mã} (SubmissionDetail)
 *        screening  : { status: 'PROCESSING' | 'DONE', spamScore, credibilityScore, aiSummary, threshold, windowDays }
 *        candidates : [{ trackingCode, category, title, content, address, province, status, createdAt, assignedEditorName,
 *                        evidences, similarity (0–100), aiReason, matchedPhrases: [chuỗi],
 *                        similarEvidenceUrls: [url tệp giống nhau, của cả 2 bên],
 *                        signals: { distanceMeters, minutesApart, contentSimilarity, similarImages, totalImages } }]
 *                      sắp xếp % tương đồng giảm dần, chỉ gồm hồ sơ ≥ threshold trong windowDays ngày gần nhất
 *        review     : null | { decision: 'MERGED' | 'DISTINCT', original: { trackingCode, title } | null, note, reviewedAt }
 *   POST .../duplicates/merge   { originalCode, note } -> gộp: submissions.duplicate_submission_id = id hồ sơ gốc
 *   POST .../duplicates/dismiss { note }               -> không trùng, hồ sơ tiếp tục ở hàng đợi
 *   POST .../duplicates/unmerge                        -> hoàn tác gộp
 *   Ba API ghi đều trả về dữ liệu mới (cùng dạng GET) + message; ghi chú lưu vào editorial_reviews.comments.
 *
 * TRẠNG THÁI MÀN HÌNH: AI đang quét | không có hồ sơ tương tự | có gợi ý (so sánh + kết luận) | đã gộp | đã xác nhận không trùng.
 */

const NOTE_MAX = 500

function EditorDuplicateCheck() {
  const { code } = useParams()
  const { data, error, setData } = useAsyncData(() => editorService.getDuplicates(code), code)
  const [selectedCode, setSelectedCode] = useState(null)
  const [decision, setDecision] = useState('MERGE') // 'MERGE' | 'DISTINCT'
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(null) // 'MERGE' | 'DISTINCT' | 'UNMERGE' | null
  const [notice, setNotice] = useState('')

  const back = (
    <Link to={`/editor/queue/${code}`} className="desk-back">
      <Icon name="arrowLeft" size={16} />
      Chi tiết hồ sơ
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

  const { submission, screening, candidates, review } = data
  const status = SUBMISSION_STATUS[submission.status]
  const category = CATEGORY_BY_VALUE[submission.category]
  const scanning = screening.status === 'PROCESSING'
  // Mặc định so sánh với hồ sơ giống nhất (đầu danh sách)
  const selected = candidates.find((item) => item.trackingCode === selectedCode) ?? candidates[0]
  const similarUrls = new Set(selected?.similarEvidenceUrls ?? [])

  /** Gửi kết luận; backend trả về dữ liệu mới -> thay luôn, không cần tải lại. */
  const submit = async () => {
    const trimmed = note.trim() || null
    const response =
      confirm === 'MERGE'
        ? await editorService.mergeDuplicate(code, selected.trackingCode, trimmed)
        : confirm === 'DISTINCT'
          ? await editorService.dismissDuplicates(code, trimmed)
          : await editorService.unmergeDuplicate(code)
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  const ask = (action) => {
    if (note.trim().length > NOTE_MAX) return
    setNotice('')
    setConfirm(action)
  }

  return (
    <div className="desk-detail">
      {back}

      <Alert type="success">{notice}</Alert>

      {/* ===== 1. Hồ sơ đang xét ===== */}
      <section className="admin-panel">
        <div className="detail-head__top">
          <span className="detail-head__code">
            Mã hồ sơ <strong>{submission.trackingCode}</strong>
          </span>
          <Badge tone={status?.tone}>{status?.label ?? submission.status}</Badge>
        </div>
        <h2 className="dup-title">{submission.title}</h2>
        <p className="detail-head__meta">
          {category && (
            <span>
              <Icon name={category.icon} size={14} />
              {category.label}
            </span>
          )}
          <span>
            <Icon name="mapPin" size={14} />
            {submission.province}
          </span>
          <span>
            <Icon name="clock" size={14} />
            Gửi lúc {formatDateTime(submission.createdAt)}
          </span>
          {submission.anonymous && (
            <span>
              <Icon name="eyeOff" size={14} />
              Gửi ẩn danh
            </span>
          )}
        </p>
        {screening.aiSummary && (
          <Alert type="info" title="Tóm tắt của AI">
            {screening.aiSummary}
          </Alert>
        )}
      </section>

      {/* ===== Kết quả quét AI ===== */}
      {!scanning && (
        <div className="admin-grid admin-grid--stats">
          <StatCard
            icon="shield"
            tone={screening.spamScore < 20 ? 'green' : 'red'}
            label="Nghi vấn tin rác (/100)"
            value={screening.spamScore}
            hint={screening.spamScore < 20 ? 'Thấp, nội dung hợp lệ' : 'Cần kiểm tra kỹ'}
          />
          <StatCard
            icon="checkCircle"
            tone="blue"
            label="Độ tin cậy (/100)"
            value={screening.credibilityScore}
            hint={`${submission.evidences.length} tệp đính kèm`}
          />
          <StatCard
            icon="copy"
            tone={candidates.length ? 'red' : 'green'}
            label="Hồ sơ tương tự"
            value={candidates.length}
            hint={candidates.length ? `Độ giống cao nhất ${candidates[0].similarity}%` : 'Không có hồ sơ nào vượt ngưỡng'}
          />
          <StatCard
            icon="activity"
            tone="orange"
            label="Ngưỡng gợi ý (%)"
            value={screening.threshold}
            hint={`So với hồ sơ trong ${screening.windowDays} ngày`}
          />
        </div>
      )}

      {scanning && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView
              tone="muted"
              text={`AI đang so sánh nội dung, vị trí, thời gian và hình ảnh với các hồ sơ trong ${screening.windowDays} ngày qua. Tải lại trang sau ít phút để xem kết quả.`}
            />
          </div>
        </section>
      )}

      {/* ===== Đã kết luận ===== */}
      {review?.decision === 'MERGED' && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView text={`Đã gộp vào hồ sơ ${review.original.trackingCode} "${review.original.title}". Nội dung và tệp của hồ sơ này đã được nối vào hồ sơ gốc, người gửi nhận thông báo tin đã được ghép.`}>
              <Button to={`/editor/queue/${review.original.trackingCode}`}>Mở hồ sơ gốc</Button>
              <Button to="/editor/queue" variant="secondary">
                Về hàng đợi tin bài
              </Button>
              <Button variant="ghost" onClick={() => ask('UNMERGE')}>
                <Icon name="refresh" size={16} />
                Hoàn tác gộp
              </Button>
            </ResultView>
          </div>
        </section>
      )}

      {review?.decision === 'DISTINCT' && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView text="Đã xác nhận hồ sơ không trùng. Hồ sơ tiếp tục ở hàng đợi để tiếp nhận thẩm định như một sự việc mới.">
              <Button to={`/editor/queue/${code}`}>Mở chi tiết hồ sơ</Button>
              <Button to="/editor/queue" variant="secondary">
                Về hàng đợi tin bài
              </Button>
            </ResultView>
          </div>
        </section>
      )}

      {/* ===== Không có hồ sơ tương tự ===== */}
      {!scanning && !review && candidates.length === 0 && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView
              text={`Không tìm thấy hồ sơ trùng lặp. Không có hồ sơ nào giống từ ${screening.threshold}% trở lên trong ${screening.windowDays} ngày qua, bạn có thể xử lý hồ sơ này như một sự việc mới.`}
            >
              <Button onClick={() => ask('DISTINCT')}>
                <Icon name="check" size={16} />
                Xác nhận không trùng
              </Button>
              <Button to="/editor/queue" variant="secondary">
                <Icon name="search" size={16} />
                Tìm hồ sơ thủ công
              </Button>
            </ResultView>
          </div>
        </section>
      )}

      {/* ===== 2. Gợi ý của AI | so sánh + kết luận ===== */}
      {!scanning && !review && selected && (
        <div className="review-grid">
          {/* .applicant: khối dính dưới thanh tiêu đề khi cuộn (editor.css) */}
          <aside className="admin-panel applicant">
            <div className="admin-panel__header">
              <h2>AI gợi ý {candidates.length} hồ sơ</h2>
            </div>
            <span className="field__hint">Đây là gợi ý của AI. Bạn so sánh rồi tự quyết định có gộp hay không.</span>

            <div className="role-options dup-candidates" role="radiogroup" aria-label="Hồ sơ gợi ý">
              {candidates.map((item) => {
                const level = similarityLevel(item.similarity)
                const checked = item.trackingCode === selected.trackingCode
                return (
                  <label key={item.trackingCode} className={`role-option ${checked ? 'is-selected' : ''}`}>
                    <input type="radio" name="candidate" checked={checked} onChange={() => setSelectedCode(item.trackingCode)} />
                    <span className="dup-candidate">
                      <Badge tone={level.tone}>
                        {level.label} · {item.similarity}%
                      </Badge>
                      <strong>{item.title}</strong>
                      <span className="role-bars__track">
                        <span className={`role-bars__fill role-bars__fill--${level.bar}`} style={{ width: `${item.similarity}%` }} />
                      </span>
                      <small>
                        <span className="data-table__mono">{item.trackingCode}</span> · {formatDateTime(item.createdAt)}
                      </small>
                    </span>
                  </label>
                )
              })}
            </div>
            <span className="field__hint">{similarityLegend(screening.threshold)}</span>
          </aside>

          <div className="admin-stack">
            {/* ----- So sánh ----- */}
            <section className="admin-panel">
              <div className="admin-panel__header">
                <h2>So sánh chi tiết</h2>
                <span>
                  Phần <mark className="dup-mark">tô vàng</mark> là đoạn AI thấy giống nhau
                </span>
              </div>

              <div className="app-facts__tags">
                {matchSignals(selected.signals).map((signal) => (
                  <Badge key={signal.icon} tone={signal.match ? 'red' : 'neutral'}>
                    <Icon name={signal.icon} size={13} />
                    &nbsp;{signal.label}
                  </Badge>
                ))}
              </div>

              {selected.aiReason && (
                <Alert type={selected.similarity >= 85 ? 'warning' : 'info'} title="Nhận định của AI">
                  {selected.aiReason}
                </Alert>
              )}

              <div className="dup-sides">
                <DuplicateSide
                  tag="Hồ sơ đang xét"
                  tagTone="dark"
                  record={submission}
                  phrases={selected.matchedPhrases}
                  similarUrls={similarUrls}
                  extraFact={{ label: 'Người gửi', value: submission.anonymous ? 'Ẩn danh' : 'Công khai danh tính' }}
                />
                <DuplicateSide
                  tag={`Hồ sơ gợi ý · ${selected.similarity}%`}
                  tagTone="orange"
                  status={SUBMISSION_STATUS[selected.status]}
                  record={selected}
                  phrases={selected.matchedPhrases}
                  similarUrls={similarUrls}
                  extraFact={{ label: 'Phụ trách', value: selected.assignedEditorName ?? 'Chưa có' }}
                />
              </div>
            </section>

            {/* ----- Kết luận ----- */}
            <section className="admin-panel review-box">
              <div className="admin-panel__header">
                <h2>Kết luận</h2>
                <span>
                  Đang so sánh với <b className="data-table__mono">{selected.trackingCode}</b>
                </span>
              </div>

              <div className="role-options" role="radiogroup" aria-label="Kết luận">
                <label className={`role-option ${decision === 'MERGE' ? 'is-selected' : ''}`}>
                  <input type="radio" name="decision" checked={decision === 'MERGE'} onChange={() => setDecision('MERGE')} />
                  <span>
                    <strong>Trùng sự việc, gộp vào hồ sơ đang so sánh</strong>
                    <small>Hồ sơ này trở thành bản trùng của hồ sơ gốc. Nội dung và tệp được nối vào hồ sơ gốc, không xử lý riêng nữa.</small>
                  </span>
                </label>
                <label className={`role-option ${decision === 'DISTINCT' ? 'is-selected' : ''}`}>
                  <input type="radio" name="decision" checked={decision === 'DISTINCT'} onChange={() => setDecision('DISTINCT')} />
                  <span>
                    <strong>Không trùng, xử lý như sự việc mới</strong>
                    <small>Bỏ qua gợi ý của AI. Hồ sơ tiếp tục ở hàng đợi để tiếp nhận thẩm định bình thường.</small>
                  </span>
                </label>
              </div>

              <TextField
                label="Ghi chú nội bộ"
                multiline
                rows={3}
                counter={NOTE_MAX}
                placeholder="Ví dụ: cùng điểm ngập, cùng thời điểm, ảnh chụp cùng góc."
                hint="Không bắt buộc. Lưu vào lịch sử thẩm định, người gửi không thấy."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                error={note.trim().length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : ''}
              />

              <div className="review-box__actions">
                <Button variant="ghost" to={`/editor/queue/${code}`}>
                  Để sau
                </Button>
                <Button onClick={() => ask(decision)}>
                  <Icon name={decision === 'MERGE' ? 'copy' : 'check'} size={16} />
                  {decision === 'MERGE' ? 'Gộp hồ sơ' : 'Xác nhận không trùng'}
                </Button>
              </div>
            </section>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'MERGE' ? 'Gộp hồ sơ trùng' : confirm === 'UNMERGE' ? 'Hoàn tác gộp' : 'Xác nhận không trùng'}
        message={
          confirm === 'MERGE'
            ? `Gộp hồ sơ ${code} vào hồ sơ gốc ${selected?.trackingCode}? Hồ sơ này sẽ không được xử lý riêng nữa.`
            : confirm === 'UNMERGE'
              ? `Tách hồ sơ ${code} khỏi hồ sơ gốc và đưa lại vào hàng đợi?`
              : `Xác nhận hồ sơ ${code} không trùng với hồ sơ nào và tiếp tục xử lý như sự việc mới?`
        }
        confirmLabel={confirm === 'MERGE' ? 'Gộp hồ sơ' : confirm === 'UNMERGE' ? 'Hoàn tác' : 'Xác nhận'}
        onConfirm={submit}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

export default EditorDuplicateCheck
