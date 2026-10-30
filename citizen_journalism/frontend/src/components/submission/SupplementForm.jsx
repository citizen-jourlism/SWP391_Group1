import { useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Icon from '../ui/Icon'
import TextField from '../ui/TextField'
import EvidenceUploader from './EvidenceUploader'
import { useForm } from '../../hooks/useForm'
import { MB, SUPPLEMENT_LIMITS, splitRequestNote } from '../../lib/submission'
import { submissionService } from '../../services/submissionService'
import '../../assets/styles/submit.css'
import '../../assets/styles/supplement.css'

/*
 * FORM BỔ SUNG THÔNG TIN cho hồ sơ đang "Cần bổ sung". Nằm trong trang routes/SupplementSubmission.jsx.
 * CSS: submit.css (form-card, uploader) + supplement.css (answer-block, source-row...).
 *
 * HAI DẠNG theo vai trò người gửi (UC "Provide Additional Information"):
 *   - Người dân            : 1. Nội dung bổ sung (địa chỉ chính xác + ô thông tin bổ sung ≤ 2000 ký tự)
 *                            2. Tư liệu bổ sung     3. Cam kết + gửi
 *     Phải có ÍT NHẤT một thứ: thông tin bổ sung, địa chỉ mới hoặc tệp.
 *   - Chuyên gia           : 1. Trả lời TỪNG mục biên tập viên hỏi (lời nhắn có "1. ...", "2. ..."; không có mục thì 1 ô chung)
 *                               Tổng các câu trả lời ≤ 4000 ký tự (dùng chung, mục nào dài ngắn tuỳ ý)
 *                            2. Nguồn tham khảo bổ sung (tên nguồn + đường dẫn / DOI, khớp Evidences.source_ref)
 *                            3. Tài liệu đính kèm   4. Xác nhận + gửi
 *
 * Gửi lên: submissionService.supplement(mã, { additionalInfo, answers, address, sources }, files).
 * Chuyên gia trả lời từng mục: gửi answers (mỗi mục 1 phần tử), backend tự ghép "Mục 1: ...". Thành công -> onSubmitted({ payload, files }).
 * payload đưa cho onSubmitted có thêm additionalInfo đã ghép sẵn để trang "Đã gửi" hiện lại nội dung.
 */

const newSource = () => ({ id: crypto.randomUUID(), title: '', url: '' })

/** Số ký tự thông tin bổ sung tối đa: Chuyên gia 4000, còn lại 2000. */
const infoLimitOf = (isExpert) => (isExpert ? SUPPLEMENT_LIMITS.expertInfoMax : SUPPLEMENT_LIMITS.infoMax)

/** Tổng số ký tự các câu trả lời từng mục (không tính khoảng trắng đầu/cuối, giống backend). */
const answersLength = (answers) => answers.reduce((sum, answer) => sum + answer.trim().length, 0)

/** Kiểm tra form. Trả về { tênÔ: lỗi }; lỗi của ô động dùng khoá answer0, answer1..., source0... */
const buildValidator = ({ isExpert, items, options, originalAddress }) => (values) => {
  const errors = {}
  const { addressMax, sourceTitleMax, sourceUrlMax } = SUPPLEMENT_LIMITS
  const infoMax = infoLimitOf(isExpert)
  const info = values.additionalInfo.trim()

  if (isExpert && items.length > 0) {
    values.answers.forEach((answer, index) => {
      if (!answer.trim()) errors[`answer${index}`] = 'Vui lòng trả lời mục này.'
    })
    const total = answersLength(values.answers)
    if (total > infoMax) errors.answers = `Tổng các câu trả lời tối đa ${infoMax} ký tự (hiện ${total}).`
  } else if (isExpert && !info) {
    errors.additionalInfo = 'Vui lòng nhập nội dung trả lời toà soạn.'
  }
  if (info.length > infoMax) errors.additionalInfo = `Thông tin bổ sung tối đa ${infoMax} ký tự.`

  if (!isExpert) {
    const address = values.address.trim()
    if (address.length > addressMax) errors.address = `Địa chỉ tối đa ${addressMax} ký tự.`
    const changedAddress = address && address !== originalAddress
    if (!info && !changedAddress && values.files.length === 0 && !errors.address) {
      errors.additionalInfo = 'Vui lòng nhập nội dung bổ sung hoặc đính kèm ít nhất 1 tệp.'
    }
  }

  if (isExpert) {
    values.sources.forEach((source, index) => {
      const title = source.title.trim()
      const url = source.url.trim()
      if (url && !title) errors[`source${index}`] = 'Vui lòng nhập tên nguồn.'
      else if (title.length > sourceTitleMax) errors[`source${index}`] = `Tên nguồn tối đa ${sourceTitleMax} ký tự.`
      else if (url.length > sourceUrlMax) errors[`source${index}`] = `Đường dẫn tối đa ${sourceUrlMax} ký tự.`
    })
  }

  if (values.files.reduce((sum, item) => sum + item.file.size, 0) > options.maxTotalSizeMb * MB) {
    errors.files = `Tổng dung lượng các tệp vượt quá ${options.maxTotalSizeMb}MB.`
  }
  if (!values.confirmed) errors.confirmed = 'Bạn cần xác nhận trước khi gửi.'
  return errors
}

/** Gom giá trị form thành dữ liệu gửi backend (ô trống -> null, giống lib/payload.js). */
const buildPayload = ({ values, isExpert, items, originalAddress }) => {
  const byItem = isExpert && items.length > 0
  const additionalInfo = byItem ? '' : values.additionalInfo.trim()
  const address = values.address.trim()
  return {
    additionalInfo: additionalInfo || null,
    answers: byItem ? values.answers.map((answer) => answer.trim()) : [],
    address: !isExpert && address && address !== originalAddress ? address : null,
    sources: isExpert
      ? values.sources
          .filter((source) => source.title.trim())
          .map((source) => ({ title: source.title.trim(), url: source.url.trim() || null }))
      : [],
  }
}

function SectionHeader({ step, title, description }) {
  return (
    <header className="form-card__head">
      <span className="form-card__step">{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  )
}

/**
 * Props:
 *   - detail      : SubmissionDetail của hồ sơ (cần trackingCode, requestNote, address)
 *   - options     : giới hạn tệp từ GET /api/submissions/options
 *   - isExpert    : true -> dạng Chuyên gia
 *   - onCancel    : bấm "Huỷ"
 *   - onSubmitted : gửi thành công, nhận { payload, files }
 */
function SupplementForm({ detail, options, isExpert, onCancel, onSubmitted }) {
  const { items } = splitRequestNote(detail.requestNote ?? '')
  const originalAddress = detail.address ?? ''
  const infoMax = infoLimitOf(isExpert)
  const validate = buildValidator({ isExpert, items, options, originalAddress })
  const form = useForm(
    {
      address: isExpert ? '' : originalAddress,
      additionalInfo: '',
      answers: items.map(() => ''),
      sources: [newSource()],
      files: [],
      confirmed: false,
    },
    validate,
  )
  const [showAllErrors, setShowAllErrors] = useState(false) // Đã bấm Gửi -> hiện lỗi của mọi ô (kể cả ô động)
  const [progress, setProgress] = useState(0)

  const errors = validate(form.values)
  // Ô cố định: theo cơ chế của useForm (hiện sau khi rời ô). Ô động (answer0, source0...): hiện sau khi bấm Gửi.
  const errorOf = (name) => form.errorOf(name) || (showAllErrors ? errors[name] ?? '' : '')

  const setAnswer = (index, value) =>
    form.setValue('answers', form.values.answers.map((answer, i) => (i === index ? value : answer)))
  const setSource = (id, key, value) =>
    form.setValue('sources', form.values.sources.map((source) => (source.id === id ? { ...source, [key]: value } : source)))
  const removeSource = (id) => {
    const rest = form.values.sources.filter((source) => source.id !== id)
    form.setValue('sources', rest.length ? rest : [newSource()]) // Luôn giữ ít nhất 1 dòng trống để nhập
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = buildPayload({ values, isExpert, items, originalAddress })
    const files = values.files.map((item) => item.file)
    setProgress(0)
    await submissionService.supplement(detail.trackingCode, payload, files, setProgress)
    // Trang "Đã gửi" hiện additionalInfo: với câu trả lời từng mục, ghép giống cách backend lưu
    const joined = payload.answers.map((answer, index) => `Mục ${index + 1}: ${answer}`).join('\n\n')
    onSubmitted({ payload: payload.answers.length ? { ...payload, additionalInfo: joined } : payload, files })
  })

  const onSubmit = (event) => {
    setShowAllErrors(true)
    if (Object.keys(errors).length > 0) {
      // Cuộn tới lỗi đầu tiên (form dài)
      requestAnimationFrame(() =>
        document
          .querySelector('.report-form [role="alert"]')
          ?.closest('.field, .uploader, .checkbox, .source-row')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
    }
    submit(event)
  }

  const fileStep = isExpert ? 3 : 2

  return (
    <form className="report-form" onSubmit={onSubmit} noValidate>
      {form.formError && (
        <Alert type="error" title="Chưa gửi được bổ sung">
          {form.formError}
        </Alert>
      )}

      {/* ----- 1. Nội dung ----- */}
      {isExpert ? (
        <section className="form-card">
          <SectionHeader
            step={1}
            title="Trả lời yêu cầu của biên tập viên"
            description={
              items.length > 0
                ? `Trả lời từng mục, tổng tối đa ${infoMax} ký tự. Mục nào cần tệp, đính kèm ở phần 3.`
                : `Trả lời đề nghị của toà soạn, tối đa ${infoMax} ký tự.`
            }
          />
          {items.length > 0 ? (
            <>
              {items.map((item, index) => (
                <div className="answer-block" key={index}>
                  <p className="answer-block__q">
                    <span className="request-items__num">{index + 1}</span>
                    {item}
                  </p>
                  <TextField
                    label={`Trả lời mục ${index + 1}`}
                    multiline
                    rows={4}
                    value={form.values.answers[index]}
                    onChange={(event) => setAnswer(index, event.target.value)}
                    error={errorOf(`answer${index}`)}
                  />
                </div>
              ))}
              {/* Bộ đếm CHUNG cho mọi câu trả lời (cùng kiểu với bộ đếm của TextField) */}
              <div className="field__meta answers-total">
                {errorOf('answers') && (
                  <p className="field__error" role="alert">
                    <Icon name="alertCircle" size={14} />
                    {errorOf('answers')}
                  </p>
                )}
                <span className={`field__counter ${answersLength(form.values.answers) > infoMax ? 'is-over' : ''}`}>
                  Tổng: {answersLength(form.values.answers)}/{infoMax}
                </span>
              </div>
            </>
          ) : (
            <TextField
              label="Nội dung trả lời"
              required
              multiline
              rows={7}
              counter={infoMax}
              {...form.field('additionalInfo')}
              error={errorOf('additionalInfo')}
            />
          )}
        </section>
      ) : (
        <section className="form-card">
          <SectionHeader
            step={1}
            title="Nội dung bổ sung"
            description="Trả lời lần lượt các mục toà soạn yêu cầu. Có thể bỏ trống nếu bạn chỉ gửi thêm tệp."
          />
          <div className="form">
            <TextField
              label="Địa chỉ chính xác của sự việc"
              icon="mapPin"
              placeholder="Số nhà, hẻm, đường, phường"
              hint={`Cập nhật nếu địa chỉ ban đầu chưa đủ rõ. Tối đa ${SUPPLEMENT_LIMITS.addressMax} ký tự.`}
              {...form.field('address')}
              error={errorOf('address')}
            />
            <TextField
              label="Thông tin bổ sung"
              multiline
              rows={7}
              counter={infoMax}
              placeholder="Ví dụ: thời gian xảy ra thường xuyên, người chứng kiến, cơ quan đã phản ánh..."
              {...form.field('additionalInfo')}
              error={errorOf('additionalInfo')}
            />
          </div>
        </section>
      )}

      {/* ----- 2. Nguồn tham khảo (chỉ Chuyên gia) ----- */}
      {isExpert && (
        <section className="form-card">
          <SectionHeader
            step={2}
            title="Nguồn tham khảo bổ sung"
            description="Báo cáo, bài báo khoa học hoặc bộ dữ liệu: ghi tên nguồn và đường dẫn / DOI. Không bắt buộc."
          />
          <div className="source-list">
            {form.values.sources.map((source, index) => (
              <div key={source.id}>
                <div className="source-row">
                  <input
                    className="field__input"
                    aria-label={`Tên nguồn ${index + 1}`}
                    placeholder="Tên báo cáo, bài báo, bộ dữ liệu"
                    value={source.title}
                    onChange={(event) => setSource(source.id, 'title', event.target.value)}
                  />
                  <input
                    className="field__input"
                    aria-label={`Đường dẫn hoặc DOI của nguồn ${index + 1}`}
                    placeholder="https://... hoặc doi:..."
                    value={source.url}
                    onChange={(event) => setSource(source.id, 'url', event.target.value)}
                  />
                  <button
                    type="button"
                    className="source-row__remove"
                    onClick={() => removeSource(source.id)}
                    aria-label={`Xoá nguồn ${index + 1}`}
                    title="Xoá nguồn"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                {errorOf(`source${index}`) && (
                  <p className="field__error" role="alert">
                    <Icon name="alertCircle" size={14} />
                    {errorOf(`source${index}`)}
                  </p>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className="btn--sm"
            disabled={form.values.sources.length >= SUPPLEMENT_LIMITS.maxSources}
            onClick={() => form.setValue('sources', [...form.values.sources, newSource()])}
          >
            <Icon name="plus" size={16} />
            Thêm nguồn
          </Button>
        </section>
      )}

      {/* ----- Tệp bổ sung ----- */}
      <section className="form-card">
        <SectionHeader
          step={fileStep}
          title={isExpert ? 'Tài liệu đính kèm' : 'Tư liệu bổ sung'}
          description={
            isExpert
              ? 'Báo cáo gốc, bảng số liệu, văn bằng hoặc giấy xác nhận công tác. Không bắt buộc.'
              : 'Ảnh, video, ghi âm hoặc giấy tờ liên quan. Tệp gốc giúp toà soạn xác minh nhanh hơn.'
          }
        />
        <EvidenceUploader
          files={form.values.files}
          onChange={(files) => form.setValue('files', files)}
          options={options}
          error={errorOf('files')}
        />
      </section>

      {/* ----- Cam kết + gửi ----- */}
      <section className="form-card form-card--submit">
        <Checkbox
          label={
            isExpert
              ? 'Tôi xác nhận thông tin bổ sung chính xác và khai báo xung đột lợi ích là đầy đủ.'
              : 'Tôi cam kết thông tin và tư liệu bổ sung là trung thực, do tôi thu thập hoặc được phép chia sẻ.'
          }
          {...form.field('confirmed')}
          error={errorOf('confirmed')}
        />
        {form.submitting && (
          <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="supplement-actions">
          <Button variant="ghost" onClick={onCancel} disabled={form.submitting}>
            Huỷ
          </Button>
          <Button type="submit" loading={form.submitting}>
            {!form.submitting && <Icon name="send" size={18} />}
            Gửi bổ sung
          </Button>
        </div>
      </section>
    </form>
  )
}

export default SupplementForm
