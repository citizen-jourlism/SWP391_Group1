import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import Icon from '../../components/ui/Icon'
import ResultView from '../../components/ui/ResultView'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { IMPACT_CRITERIA, IMPACT_LEVELS, IMPACT_LEVEL_BY_CODE, IMPACT_LIMITS, escalatesToEic, evaluateImpact } from '../../lib/impactScore'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import { impactService } from '../../services/impactService'
import '../../assets/styles/impact.css'
import '../../assets/styles/tracking.css' // Đầu hồ sơ (.detail-head__*)

/*
 * ĐÁNH GIÁ MỨC TÁC ĐỘNG (UC Editor "Assess Impact Score") — /editor/queue/:code/impact.
 * Mở từ nút "Đánh giá mức tác động" ở chi tiết hồ sơ (EditorSubmissionDetail).
 * Biên tập viên CHỈ TICK 3 tiêu chí (+ "Nội dung nhạy cảm"); hệ thống tự tính điểm và xếp 4 mức
 * Thấp / Trung bình / Cao / Khẩn cấp. Màn hình KHÔNG hiện điểm. Mức quyết định ai duyệt chốt:
 *   Thấp / Trung bình -> Phó TBT phụ trách lĩnh vực; Cao / Khẩn cấp -> Phó TBT chuyển tiếp, Tổng biên tập duyệt chốt.
 *
 * API (backend: EditorController -> ImpactScoreService):
 *   GET  /api/editor/submissions/{mã}/impact -> { submission, assessable, blockedReason, deputyName, assessment }
 *        assessment: null | { area, people, nature, sensitive, sensitiveReason, note, priority, raised,
 *                             escalateToEic, assessedAt, editorName }
 *   POST cùng đường dẫn { area, people, nature, sensitive, sensitiveReason, note } -> cùng dạng GET + message
 *   Chỉ đánh giá khi hồ sơ Đang thẩm định; đánh giá lại = ghi đè mức cũ. Người gửi không thấy mức đánh giá.
 *
 * TRẠNG THÁI MÀN HÌNH: chưa đánh giá | đang chọn | đã lưu (ResultView) | không đánh giá được (khoá form).
 */

const EMPTY_CHOICES = { area: null, people: null, nature: null }

function EditorImpactAssessment() {
  const { code } = useParams()
  const { data, error, setData } = useAsyncData(() => impactService.getAssessment(code), code)
  const [form, setForm] = useState(null) // null = chưa sửa gì (lấy theo lần đánh giá đã lưu)
  const [editing, setEditing] = useState(false) // Đã lưu nhưng BTV bấm "Đánh giá lại"
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
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

  const { submission, assessable, blockedReason, deputyName, assessment } = data
  const status = SUBMISSION_STATUS[submission.status]
  const category = CATEGORY_BY_VALUE[submission.category]
  const values = form ?? fromAssessment(assessment)
  const preview = evaluateImpact(values.choices, values.sensitive)
  const reasonLength = values.sensitiveReason.trim().length
  const reasonError =
    values.sensitive && reasonLength > IMPACT_LIMITS.reasonMax ? `Tối đa ${IMPACT_LIMITS.reasonMax} ký tự.` : ''
  const noteError = values.note.trim().length > IMPACT_LIMITS.noteMax ? `Tối đa ${IMPACT_LIMITS.noteMax} ký tự.` : ''
  const canSave =
    assessable && preview && !reasonError && !noteError && (!values.sensitive || reasonLength >= IMPACT_LIMITS.reasonMin)
  const showResult = assessment && !editing

  const update = (patch) => setForm({ ...values, ...patch })

  const save = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const response = await impactService.assess(code, {
        ...values.choices,
        sensitive: values.sensitive,
        sensitiveReason: values.sensitive ? values.sensitiveReason.trim() : null,
        note: values.note.trim() || null,
      })
      setData(response.data)
      setNotice(response.message)
      setForm(null)
      setEditing(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="desk-detail">
      {back}
      <Alert type="success">{notice}</Alert>

      {/* ===== Hồ sơ đang đánh giá ===== */}
      <section className="admin-panel">
        <div className="detail-head__top">
          <span className="detail-head__code">
            Mã hồ sơ <strong>{submission.trackingCode}</strong>
          </span>
          <Badge tone={status?.tone}>{status?.label ?? submission.status}</Badge>
        </div>
        <h2 className="impact-title">{submission.title}</h2>
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
        </p>
        {submission.summary && (
          <Alert type="info" title="Tóm tắt nội dung">
            {submission.summary}
          </Alert>
        )}
      </section>

      {!assessable && (
        <Alert type="warning" title="Không thể đánh giá">
          {blockedReason}
        </Alert>
      )}

      {/* ===== Đã lưu ===== */}
      {showResult && (
        <section className="admin-panel">
          <ResultView compact text={<SavedText assessment={assessment} deputyName={deputyName} />}>
            <Button to={`/editor/queue/${code}`}>Về chi tiết hồ sơ</Button>
            {assessable && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <Icon name="edit" size={16} />
                Đánh giá lại
              </Button>
            )}
          </ResultView>
        </section>
      )}

      {!showResult && (
        <div className="impact-grid">
          {/* ===== Cột trái: 3 tiêu chí + nâng mức đặc biệt ===== */}
          <fieldset className="admin-stack impact-form" disabled={!assessable || saving}>
            {IMPACT_CRITERIA.map((criterion) => (
              <section key={criterion.key} className="admin-panel">
                <div className="admin-panel__header">
                  <h2>{criterion.title}</h2>
                </div>
                <span className="field__hint">{criterion.hint}</span>
                <div className="role-options impact-options" role="radiogroup" aria-label={criterion.title}>
                  {criterion.options.map((option) => {
                    const checked = values.choices[criterion.key] === option.value
                    return (
                      <label key={option.value} className={`role-option ${checked ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name={criterion.key}
                          value={option.value}
                          checked={checked}
                          onChange={() => update({ choices: { ...values.choices, [criterion.key]: option.value } })}
                        />
                        <span className="impact-option">
                          <strong>{option.label}</strong>
                          <small>{option.example}</small>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>
            ))}

            <section className="admin-panel">
              <div className="admin-panel__header">
                <h2>Nâng mức đặc biệt</h2>
              </div>
              <Checkbox
                checked={values.sensitive}
                onChange={(event) => update({ sensitive: event.target.checked })}
                label={
                  <>
                    <b>Nội dung nhạy cảm</b>: nêu đích danh cơ quan, cán bộ hoặc có rủi ro pháp lý. Hồ sơ được nâng tối
                    thiểu lên mức Cao và do Tổng biên tập duyệt chốt.
                  </>
                }
              />
              {values.sensitive && (
                <TextField
                  label="Lý do nhạy cảm"
                  required
                  multiline
                  rows={3}
                  counter={IMPACT_LIMITS.reasonMax}
                  hint={`Bắt buộc, ${IMPACT_LIMITS.reasonMin} - ${IMPACT_LIMITS.reasonMax} ký tự.`}
                  error={reasonError}
                  placeholder="Ví dụ: Bài nêu tên Công ty cấp nước và trách nhiệm của đơn vị quản lý."
                  value={values.sensitiveReason}
                  onChange={(event) => update({ sensitiveReason: event.target.value })}
                />
              )}
            </section>
          </fieldset>

          {/* ===== Cột phải: kết quả (dính khi cuộn) ===== */}
          <aside className="admin-panel applicant impact-summary">
            <div className="admin-panel__header">
              <h2>Kết quả đánh giá</h2>
            </div>
            <div className="impact-level">
              <span>Mức độ</span>
              {preview ? (
                <Badge tone={preview.level.tone}>
                  {preview.level.label} · {preview.level.code}
                </Badge>
              ) : (
                <span className="field__hint">Chọn đủ 3 tiêu chí</span>
              )}
            </div>
            <div className="impact-scale" aria-hidden="true">
              {IMPACT_LEVELS.map((level) => (
                <span
                  key={level.code}
                  className={`impact-scale__band impact-scale__band--${level.code.toLowerCase()} ${
                    preview?.level.code === level.code ? 'is-current' : ''
                  }`}
                >
                  {level.label}
                </span>
              ))}
            </div>
            <span className="field__hint">Hệ thống tự xếp mức theo 3 tiêu chí bạn chọn.</span>

            {preview?.raised && (
              <Alert type="warning">
                <b>Đã nâng lên mức Cao</b> vì {preview.reasons.join(' và ')} (theo 3 tiêu chí chỉ ở mức{' '}
                {preview.baseLevel.label}).
              </Alert>
            )}
            {preview && <ApprovalRoute levelCode={preview.level.code} deputyName={deputyName} />}

            <TextField
              label="Ghi chú nội bộ"
              multiline
              rows={3}
              counter={IMPACT_LIMITS.noteMax}
              error={noteError}
              placeholder="Căn cứ ước tính số người, phạm vi... (không bắt buộc)"
              value={values.note}
              disabled={!assessable || saving}
              onChange={(event) => update({ note: event.target.value })}
            />

            <Alert type="error">{saveError}</Alert>
            <Button block loading={saving} disabled={!canSave} onClick={save}>
              <Icon name="check" size={16} />
              Lưu đánh giá
            </Button>
            {assessable && (
              <span className="field__hint">Lưu xong mới duyệt chuyển Phó TBT được. Người gửi không thấy mức đánh giá.</span>
            )}
            {editing && (
              <Button variant="ghost" block onClick={() => { setEditing(false); setForm(null) }}>
                Huỷ đánh giá lại
              </Button>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

/** Giá trị form ban đầu: theo lần đánh giá đã lưu, hoặc trống. */
function fromAssessment(assessment) {
  if (!assessment) return { choices: EMPTY_CHOICES, sensitive: false, sensitiveReason: '', note: '' }
  return {
    choices: { area: assessment.area, people: assessment.people, nature: assessment.nature },
    sensitive: assessment.sensitive,
    sensitiveReason: assessment.sensitiveReason ?? '',
    note: assessment.note ?? '',
  }
}

/** Luồng duyệt: Bạn duyệt -> Phó TBT (-> Tổng biên tập). */
function ApprovalRoute({ levelCode, deputyName }) {
  const toEic = escalatesToEic(levelCode)
  return (
    <>
      <div className="impact-route">
        <span className="impact-route__step">
          <Icon name="user" size={14} />
          Bạn duyệt
        </span>
        <span aria-hidden="true">›</span>
        <span className="impact-route__step">{deputyName ? `Phó TBT ${deputyName}` : 'Phó TBT phụ trách'}</span>
        {toEic && (
          <>
            <span aria-hidden="true">›</span>
            <span className="impact-route__step impact-route__step--eic">Tổng biên tập</span>
          </>
        )}
      </div>
      <p className="field__hint">
        {toEic
          ? 'Mức Cao / Khẩn cấp: Phó TBT xem trước rồi chuyển tiếp, Tổng biên tập duyệt chốt.'
          : 'Mức Thấp / Trung bình: Phó TBT phụ trách lĩnh vực duyệt chốt.'}
      </p>
    </>
  )
}

/** Câu thông báo ở khối "Đã lưu". */
function SavedText({ assessment, deputyName }) {
  const level = IMPACT_LEVEL_BY_CODE[assessment.priority]
  const deputy = deputyName ? `Phó TBT ${deputyName}` : 'Phó TBT phụ trách'
  return (
    <>
      <b>
        Đã lưu đánh giá: mức {level?.label} ({assessment.priority}).
      </b>{' '}
      {assessment.escalateToEic ? (
        <>
          Khi bạn duyệt, hồ sơ chuyển tới <b>{deputy}</b>; vì mức {level?.label}, Phó TBT sẽ chuyển tiếp lên{' '}
          <b>Tổng biên tập</b> duyệt chốt.
        </>
      ) : (
        <>
          Khi bạn duyệt, <b>{deputy}</b> sẽ duyệt chốt hồ sơ.
        </>
      )}{' '}
      Đánh giá lúc {formatDateTime(assessment.assessedAt)}
      {assessment.editorName && ` bởi ${assessment.editorName}`}. Người gửi không thấy mức đánh giá này.
    </>
  )
}

export default EditorImpactAssessment
