import { useEffect, useState } from 'react'
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
import { screeningService } from '../../services/screeningService'
import '../../assets/styles/contributor.css' // Hàng nhãn tín hiệu (.app-facts__tags)
import '../../assets/styles/screening.css'
import '../../assets/styles/submit.css' // Danh sách tệp (.evidence-list)
import '../../assets/styles/tracking.css' // Đầu hồ sơ, thông tin, nội dung (.detail-head__*, .detail-facts, .detail-content)

/*
 * KIỂM TRA TIN TRÙNG (UC Editor #05 "Check for Duplication") — /editor/screening/:code.
 * Mở từ nút "Kiểm tra tin trùng" ở chi tiết hồ sơ (EditorSubmissionDetail). AI CHỈ HỖ TRỢ RA QUYẾT ĐỊNH: Biên tập viên
 * xem kết quả AI quét hồ sơ và các hồ sơ AI cho là tương tự, so sánh từng cặp rồi ghi nhận kết luận
 * (trùng với hồ sơ nào / không trùng). Kết luận chỉ được lưu lại, không gộp hay đổi dữ liệu hồ sơ;
 * hồ sơ trùng thì Biên tập viên xử lý tiếp bằng các chức năng sẵn có (ví dụ Từ chối hồ sơ).
 *
 * API (backend: EditorController -> DuplicateReviewService; AI quét bằng RAG: DuplicateDetectionService):
 *   GET  /api/editor/submissions/{mã}/duplicates          -> { submission, screening, candidates, review }
 *        submission : như GET /api/editor/submissions/{mã} (SubmissionDetail)
 *        screening  : { status: 'PROCESSING' | 'DONE', aiSummary, threshold, windowDays, checkedAt }
 *        candidates : [{ trackingCode, category, title, content, address, province, status, createdAt, assignedEditorName,
 *                        evidences, similarity (0–100), aiReason, matchedPhrases: [chuỗi],
 *                        signals: { distanceMeters (luôn null, hồ sơ không có toạ độ), sameProvince,
 *                                   minutesApart (null nếu không rõ), contentSimilarity } }]
 *                      sắp xếp % tương đồng giảm dần, chỉ gồm hồ sơ ≥ threshold trong windowDays ngày gần nhất
 *        review     : null | { decision: 'DUPLICATE' | 'DISTINCT', original: { trackingCode, title } | null, note, reviewedAt }
 *        Lần đầu mở (hoặc người gửi vừa bổ sung) backend bắt đầu quét và trả về PROCESSING; tải lại sau ít giây.
 *   POST .../duplicates/confirm { originalCode, note } -> ghi nhận: trùng với hồ sơ originalCode
 *   POST .../duplicates/dismiss { note }               -> ghi nhận: không trùng
 *   Hai API đều trả về dữ liệu mới (cùng dạng GET) + message. Ghi lại lần nữa = đổi kết luận (lần mới nhất có hiệu lực).
 *   Kết luận + ghi chú nội bộ lưu ở submission_events (người gửi không thấy); hồ sơ vẫn ở hàng đợi, trạng thái không đổi.
 *
 * TRẠNG THÁI MÀN HÌNH: AI đang quét | không có hồ sơ tương tự | có gợi ý (so sánh + kết luận) | đã ghi nhận trùng | đã ghi nhận không trùng.
 */

const NOTE_MAX = 500

function EditorDuplicateCheck() {
  const { code } = useParams()
  const { data, error, reload, setData } = useAsyncData(() => screeningService.getDuplicates(code), code)
  const [selectedCode, setSelectedCode] = useState(null)
  const [decision, setDecision] = useState('DUPLICATE') // 'DUPLICATE' | 'DISTINCT'
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(null) // 'DUPLICATE' | 'DISTINCT' | null
  const [editing, setEditing] = useState(false) // Đã có kết luận nhưng Biên tập viên muốn đổi
  const [notice, setNotice] = useState('')

  // AI đang quét trên máy chủ -> tự hỏi lại mỗi 3 giây cho tới khi có kết quả
  const scanningNow = data?.screening.status === 'PROCESSING'
  useEffect(() => {
    if (!scanningNow) return undefined
    const timer = setTimeout(reload, 3000)
    return () => clearTimeout(timer)
  }, [scanningNow, data, reload])

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

  /** Gửi kết luận; backend trả về dữ liệu mới -> thay luôn, không cần tải lại. */
  const submit = async () => {
    const trimmed = note.trim() || null
    const response =
      confirm === 'DUPLICATE'
        ? await screeningService.confirmDuplicate(code, selected.trackingCode, trimmed)
        : await screeningService.dismissDuplicates(code, trimmed)
    setData(response.data)
    setNotice(response.message)
    setNote('')
    setEditing(false)
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
            icon="copy"
            tone={candidates.length ? 'red' : 'green'}
            label="Hồ sơ tương tự"
            value={candidates.length}
            hint={candidates.length ? `Độ giống cao nhất ${candidates[0].similarity}%` : `Trong ${screening.windowDays} ngày qua`}
          />
        </div>
      )}

      {scanning && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView compact
              tone="muted"
              text={`AI đang so sánh nội dung, vị trí và thời gian với các hồ sơ trong ${screening.windowDays} ngày qua. Trang tự cập nhật khi có kết quả.`}
            />
          </div>
        </section>
      )}

      {/* ===== Đã kết luận ===== */}
      {review?.decision === 'DUPLICATE' && !editing && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView compact
              text={`Đã ghi nhận hồ sơ này trùng với hồ sơ ${review.original.trackingCode} "${review.original.title}". Hồ sơ vẫn ở hàng đợi, bạn xử lý tiếp bằng các chức năng thẩm định.`}
            >
              <Button to={`/editor/queue/${code}/reject`}>Từ chối hồ sơ</Button>
              <Button to={`/editor/queue/${review.original.trackingCode}`} variant="secondary">
                Mở hồ sơ trùng
              </Button>
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <Icon name="edit" size={16} />
                Đổi kết luận
              </Button>
            </ResultView>
          </div>
        </section>
      )}

      {review?.decision === 'DISTINCT' && !editing && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView compact text="Đã ghi nhận hồ sơ không trùng. Hồ sơ tiếp tục ở hàng đợi để tiếp nhận thẩm định như một sự việc mới.">
              <Button to={`/editor/queue/${code}`}>Mở chi tiết hồ sơ</Button>
              <Button to="/editor/queue" variant="secondary">
                Về hàng đợi tin bài
              </Button>
              {candidates.length > 0 && (
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  <Icon name="edit" size={16} />
                  Đổi kết luận
                </Button>
              )}
            </ResultView>
          </div>
        </section>
      )}

      {/* ===== Không có hồ sơ tương tự ===== */}
      {!scanning && !review && candidates.length === 0 && (
        <section className="admin-panel">
          <div className="dup-result">
            <ResultView compact
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
      {!scanning && (!review || editing) && selected && (
        <div className="review-grid">
          {/* .applicant: khối dính dưới thanh tiêu đề khi cuộn (editor.css) */}
          <aside className="admin-panel applicant">
            <div className="admin-panel__header">
              <h2>AI gợi ý {candidates.length} hồ sơ</h2>
            </div>
            <span className="field__hint">Đây là gợi ý của AI. Bạn so sánh rồi tự quyết định có trùng hay không.</span>

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
                  extraFact={{ label: 'Người gửi', value: submission.anonymous ? 'Ẩn danh' : 'Công khai danh tính' }}
                />
                <DuplicateSide
                  tag={`Hồ sơ gợi ý · ${selected.similarity}%`}
                  tagTone="orange"
                  status={SUBMISSION_STATUS[selected.status]}
                  record={selected}
                  phrases={selected.matchedPhrases}
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
                <label className={`role-option ${decision === 'DUPLICATE' ? 'is-selected' : ''}`}>
                  <input type="radio" name="decision" checked={decision === 'DUPLICATE'} onChange={() => setDecision('DUPLICATE')} />
                  <span>
                    <strong>Trùng sự việc với hồ sơ đang so sánh</strong>
                    <small>Chỉ ghi nhận kết luận. Hồ sơ vẫn ở hàng đợi, bạn xử lý tiếp (ví dụ từ chối vì trùng).</small>
                  </span>
                </label>
                <label className={`role-option ${decision === 'DISTINCT' ? 'is-selected' : ''}`}>
                  <input type="radio" name="decision" checked={decision === 'DISTINCT'} onChange={() => setDecision('DISTINCT')} />
                  <span>
                    <strong>Không trùng, xử lý như sự việc mới</strong>
                    <small>Chỉ ghi nhận kết luận. Hồ sơ tiếp tục ở hàng đợi để tiếp nhận thẩm định bình thường.</small>
                  </span>
                </label>
              </div>

              <TextField
                label="Ghi chú nội bộ"
                multiline
                rows={3}
                counter={NOTE_MAX}
                placeholder="Ví dụ: cùng điểm ngập, cùng thời điểm, mô tả giống nhau."
                hint="Không bắt buộc. Lưu vào lịch sử thẩm định, người gửi không thấy."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                error={note.trim().length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : ''}
              />

              <div className="review-box__actions">
                {editing ? (
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Huỷ
                  </Button>
                ) : (
                  <Button variant="ghost" to={`/editor/queue/${code}`}>
                    Để sau
                  </Button>
                )}
                <Button onClick={() => ask(decision)}>
                  <Icon name={decision === 'DUPLICATE' ? 'copy' : 'check'} size={16} />
                  {decision === 'DUPLICATE' ? 'Ghi nhận trùng' : 'Ghi nhận không trùng'}
                </Button>
              </div>
            </section>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'DUPLICATE' ? 'Ghi nhận hồ sơ trùng' : 'Ghi nhận không trùng'}
        message={
          confirm === 'DUPLICATE'
            ? `Ghi nhận hồ sơ ${code} trùng sự việc với hồ sơ ${selected?.trackingCode}? Hồ sơ vẫn ở hàng đợi, không có dữ liệu nào bị gộp.`
            : `Ghi nhận hồ sơ ${code} không trùng với hồ sơ nào và tiếp tục xử lý như sự việc mới?`
        }
        confirmLabel="Ghi nhận"
        onConfirm={submit}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

export default EditorDuplicateCheck
