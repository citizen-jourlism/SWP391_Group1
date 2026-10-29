import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import SiteHeader from '../components/layout/SiteHeader'
import ArticleBody from '../components/research/ArticleBody'
import FigureEditor from '../components/research/FigureEditor'
import ResearchReader from '../components/research/ResearchReader'
import Alert from '../components/ui/Alert'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Icon from '../components/ui/Icon'
import SelectField from '../components/ui/SelectField'
import TextField from '../components/ui/TextField'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDateTime } from '../lib/format'
import { RESEARCH_STATUS, countWords, submitChecklist } from '../lib/research'
import { researchService } from '../services/researchService'
import '../assets/styles/ui.css'
import '../assets/styles/research.css'

/*
 * TRÌNH SOẠN BÀI NGHIÊN CỨU — /research/new (bài mới) và /research/:id (mở lại bản nháp / xem bài đã nộp).
 * Chỉ Chuyên gia (ProtectedRoute roles EXPERT trong App.jsx). Mở từ: thẻ "Bài nghiên cứu" trong trang Gửi thông tin,
 * trang "Bài nghiên cứu của tôi" (/research).
 *
 * BỐ CỤC KIỂU "TRANG GIẤY" (khác hẳn form gửi tin / khiếu nại vì đây là viết bài dài):
 *   ┌ SiteHeader ───────────────────────────────────────────────────────────────────────────┐
 *   ├ Thanh công cụ dính: ← Bài của tôi · [Bản nháp] Đã lưu 22:10 · 512 chữ  [Quản lý] [Lưu nháp] [Nộp bài] ┤
 *   │  ┌ Trang giấy ───────────────────────────────┐  ┌ Cột phải ────────────────────┐      │
 *   │  │ Tiêu đề (chữ lớn, không viền)             │  │ Thông tin bài: lĩnh vực, từ khoá│   │
 *   │  │ Tác giả                                   │  │ Xung đột lợi ích              │      │
 *   │  │ Tóm tắt                                   │  │ Kiểm tra trước khi nộp (✓ / ○) │      │
 *   │  │ [Viết | Xem trước] Nội dung               │  │ Mẹo định dạng                 │      │
 *   │  │ Hình ảnh minh hoạ (lưới, có chú thích)    │  └───────────────────────────────┘      │
 *   │  │ Tài liệu tham khảo                        │                                         │
 *   │  └───────────────────────────────────────────┘                                         │
 *
 * LƯU / NỘP: cùng gọi researchService.save (multipart). "Lưu nháp" không bắt buộc đủ ô; "Nộp bài" phải qua
 * bảng kiểm tra + hộp xác nhận cam kết. Bài mới lưu lần đầu -> chuyển đường dẫn sang /research/<id>.
 * Có Ctrl+S để lưu nháp nhanh, và cảnh báo khi rời trang mà còn thay đổi chưa lưu.
 * Bài đã nộp: hiện ResearchReader (chỉ đọc).
 */
function ResearchEditor() {
  const { id } = useParams()
  const location = useLocation()
  useDocumentTitle(id ? 'Bài nghiên cứu' : 'Viết bài nghiên cứu')
  // Tải CÙNG LÚC: tuỳ chọn (lĩnh vực, điều kiện nộp) + bài (nếu đang mở bài có sẵn)
  const { data, error } = useAsyncData(
    () =>
      Promise.all([researchService.getOptions(), id ? researchService.get(id) : null]).then(([options, article]) => ({
        data: { options: options.data, article: article?.data ?? null },
      })),
    id ?? 'new',
  )

  return (
    <div className="research-page">
      <SiteHeader />
      {error && !data && (
        <div className="research-layout">
          <Alert type="error" title="Không mở được bài viết">
            {error}
          </Alert>
        </div>
      )}
      {!data && !error && (
        <div className="research-layout">
          <div className="skeleton skeleton--page" />
        </div>
      )}
      {/* key: đổi bài (hoặc bài mới vừa được lưu và có id) -> tạo lại trình soạn với dữ liệu mới */}
      {data && (
        <EditorWorkspace
          key={data.article?.id ?? 'new'}
          options={data.options}
          article={data.article}
          initialNotice={location.state?.notice}
        />
      )}
    </div>
  )
}

/** Dữ liệu bài -> giá trị các ô (ô trống dùng '' vì thẻ input không nhận null). */
const toDoc = (article) => ({
  title: article?.title ?? '',
  abstractText: article?.abstractText ?? '',
  field: article?.field ?? '',
  keywords: article?.keywords ?? '',
  content: article?.content ?? '',
  references: article?.references ?? '',
  // Ô chọn xung đột lợi ích: '' = chưa khai, 'NO' / 'YES'
  hasConflict: article?.hasConflict == null ? '' : article.hasConflict ? 'YES' : 'NO',
  conflictNote: article?.conflictNote ?? '',
})

/** Ảnh đã lưu trên máy chủ -> phần tử của FigureEditor. */
const toFigures = (article) =>
  (article?.images ?? []).map((image) => ({ key: image.url, url: image.url, previewUrl: image.url, ...image, caption: image.caption ?? '' }))

/** "Ảnh chụp" nội dung để so sánh có thay đổi chưa lưu không (ảnh chỉ so khoá + chú thích). */
const snapshotOf = (doc, figures) => JSON.stringify([doc, figures.map((item) => [item.key, item.caption])])

function EditorWorkspace({ options, article, initialNotice }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(() => toDoc(article))
  const [figures, setFigures] = useState(() => toFigures(article))
  const [saved, setSaved] = useState(() => ({ snapshot: snapshotOf(toDoc(article), toFigures(article)), at: article?.updatedAt }))
  const [tab, setTab] = useState('write') // 'write' | 'preview'
  const [saving, setSaving] = useState(null) // null | 'DRAFT' | 'SUBMIT'
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(initialNotice ?? '')
  const [confirming, setConfirming] = useState(false)
  const [submitted, setSubmitted] = useState(article?.status === 'SUBMITTED' ? article : null)
  const checklistRef = useRef(null)

  const dirty = snapshotOf(doc, figures) !== saved.snapshot
  const words = countWords(doc.content)
  const checklist = submitChecklist(doc, figures, options)
  const readyCount = checklist.filter((item) => item.done).length

  /** Sửa 1 ô: cập nhật giá trị, xoá lỗi của ô đó và thông báo cũ. */
  const setField = (name) => (event) => {
    setDoc((prev) => ({ ...prev, [name]: event.target.value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setNotice('')
  }

  /** Lưu nháp (DRAFT) hoặc nộp (SUBMIT). */
  const save = async (action) => {
    setSaving(action)
    setFormError('')
    setNotice('')
    try {
      const payload = {
        action,
        ...doc,
        hasConflict: doc.hasConflict === '' ? null : doc.hasConflict === 'YES',
        images: figures.map((item) => ({ url: item.url ?? null, caption: item.caption })),
        declaration: action === 'SUBMIT', // Đã đồng ý ở hộp xác nhận
      }
      const newFiles = figures.filter((item) => !item.url).map((item) => item.file)
      const response = await researchService.save(article?.id ?? null, payload, newFiles)
      const result = response.data

      if (action === 'SUBMIT') {
        setSubmitted(result)
        window.scrollTo({ top: 0 })
      } else if (!article?.id) {
        // Bài mới vừa có id: chuyển sang /research/<id> (trang tự tải lại bài từ máy chủ), mang theo thông báo
        navigate(`/research/${result.id}`, { replace: true, state: { notice: response.message } })
      } else {
        // Thay ảnh mới (đường dẫn tạm "blob:") bằng ảnh đã lưu trên máy chủ
        figures.filter((item) => item.file).forEach((item) => URL.revokeObjectURL(item.previewUrl))
        const nextFigures = toFigures(result)
        setFigures(nextFigures)
        setSaved({ snapshot: snapshotOf(doc, nextFigures), at: result.updatedAt })
        setNotice(response.message)
      }
      setErrors({})
    } catch (error) {
      setErrors(error.errors ?? {})
      setFormError(error.message)
      throw error // Để hộp xác nhận (khi nộp) biết là lỗi
    } finally {
      setSaving(null)
    }
  }

  const saveDraft = () => save('DRAFT').catch(() => {}) // Lỗi đã hiện ở hộp thông báo đầu trang

  /** Bấm "Nộp bài": chưa đạt bảng kiểm tra thì chỉ ra mục còn thiếu, đạt rồi mới mở hộp xác nhận. */
  const askSubmit = () => {
    if (readyCount < checklist.length) {
      setFormError('Bài chưa đủ điều kiện để nộp. Xem các mục còn thiếu trong "Kiểm tra trước khi nộp".')
      checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setConfirming(true)
  }

  // Ctrl+S (hoặc Cmd+S trên Mac) = lưu nháp. Dùng ref để luôn gọi hàm saveDraft mới nhất.
  const saveDraftRef = useRef(saveDraft)
  useEffect(() => {
    saveDraftRef.current = saveDraft
  })
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault() // Không mở hộp "Lưu trang web" của trình duyệt
        saveDraftRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Còn thay đổi chưa lưu mà đóng tab / tải lại trang -> trình duyệt hỏi xác nhận
  useEffect(() => {
    if (!dirty || submitted) return undefined
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, submitted])

  // ----- Bài đã nộp: chỉ đọc -----
  if (submitted) {
    return (
      <>
        <div className="research-bar">
          <div className="research-bar__inner">
            <Link to="/research?status=SUBMITTED" className="research-bar__back">
              <Icon name="arrowLeft" size={16} />
              Bài nghiên cứu của tôi
            </Link>
            <Badge tone="green">Đã nộp</Badge>
            <span className="research-bar__spacer" />
            <Button to="/research/new" className="btn--sm">
              <Icon name="plus" size={14} />
              Viết bài mới
            </Button>
          </div>
        </div>
        <main className="research-layout research-layout--reader">
          {article?.status !== 'SUBMITTED' && (
            <Alert type="success" title="Đã nộp bài nghiên cứu cho toà soạn!">
              Bài đã được khoá chỉnh sửa và chuyển tới Ban biên tập. Bạn xem lại bài bất cứ lúc nào trong mục Bài nghiên cứu của tôi.
            </Alert>
          )}
          <ResearchReader article={submitted} author={user} />
        </main>
      </>
    )
  }

  const status = RESEARCH_STATUS.DRAFT

  return (
    <>
      {/* ===== Thanh công cụ dính ===== */}
      <div className="research-bar">
        <div className="research-bar__inner">
          <Link to="/research" className="research-bar__back">
            <Icon name="arrowLeft" size={16} />
            Bài của tôi
          </Link>
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className={`research-bar__state ${dirty ? 'is-dirty' : ''}`}>
            {dirty ? 'Có thay đổi chưa lưu' : saved.at ? `Đã lưu lúc ${formatDateTime(saved.at)}` : 'Chưa lưu'}
          </span>
          <span className="research-bar__spacer" />
          <span className="research-bar__words">{words.toLocaleString('vi-VN')} chữ</span>
          <Button to="/research" variant="ghost" className="btn--sm">
            <Icon name="fileText" size={14} />
            Quản lý bản nháp
          </Button>
          <Button variant="secondary" className="btn--sm" onClick={saveDraft} loading={saving === 'DRAFT'} disabled={Boolean(saving)}>
            {saving !== 'DRAFT' && <Icon name="check" size={14} />}
            Lưu nháp
          </Button>
          <Button className="btn--sm" onClick={askSubmit} disabled={Boolean(saving)}>
            <Icon name="send" size={14} />
            Nộp bài
          </Button>
        </div>
      </div>

      <main className="research-layout">
        <div className="research-main">
          <Alert type="error">{formError}</Alert>
          <Alert type="success">{notice}</Alert>

          {/* ===== Trang giấy ===== */}
          <article className="paper">
            <div className="paper__kicker">Bài nghiên cứu · {doc.field || 'Chưa chọn lĩnh vực'}</div>
            {/* field-sizing: content (CSS) -> ô tự cao lên theo số dòng tiêu đề */}
            <textarea
              className="paper__title"
              rows={1}
              maxLength={250}
              placeholder="Tiêu đề bài nghiên cứu"
              value={doc.title}
              onChange={setField('title')}
              aria-label="Tiêu đề"
            />
            {errors.title && <p className="field__error">{errors.title}</p>}

            <div className="paper__byline">
              <Avatar name={user?.fullName} src={user?.avatarUrl} size={34} />
              <span>
                <strong>{user?.fullName}</strong>
                <small>Chuyên gia · {article ? `bắt đầu viết ${formatDateTime(article.createdAt)}` : 'bài mới'}</small>
              </span>
            </div>

            <section className="paper__abstract">
              <TextField
                label="Tóm tắt"
                multiline
                rows={4}
                counter={1500}
                placeholder="Tóm tắt vấn đề nghiên cứu, phương pháp và kết luận chính (khoảng 100–300 chữ)."
                value={doc.abstractText}
                onChange={setField('abstractText')}
                error={errors.abstractText}
              />
            </section>

            {/* ----- Nội dung: Viết / Xem trước ----- */}
            <div className="paper__tabs" role="tablist" aria-label="Chế độ soạn thảo">
              {[
                ['write', 'edit', 'Viết'],
                ['preview', 'eye', 'Xem trước'],
              ].map(([value, icon, label]) => (
                <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>
                  <Icon name={icon} size={14} />
                  {label}
                </button>
              ))}
              <span className="paper__tabs-hint">## Tiêu đề mục · - gạch đầu dòng · **in đậm**</span>
            </div>
            {tab === 'write' ? (
              <textarea
                className="paper__body"
                placeholder={'Bắt đầu viết nội dung bài...\n\n## Đặt vấn đề\nViết đoạn văn ở đây. Để trống 1 dòng để sang đoạn mới.'}
                value={doc.content}
                onChange={setField('content')}
                aria-label="Nội dung bài"
              />
            ) : (
              <div className="paper__preview">
                <ArticleBody content={doc.content} />
              </div>
            )}
            {errors.content && <p className="field__error">{errors.content}</p>}

            {/* ----- Hình ảnh ----- */}
            <section className="paper__section">
              <h2>Hình ảnh minh hoạ & dẫn chứng</h2>
              <p className="paper__section-hint">Ảnh chụp thực địa, biểu đồ, bảng số liệu... Thêm chú thích và nguồn cho từng ảnh.</p>
              <FigureEditor
                figures={figures}
                onChange={(next) => {
                  setFigures(next)
                  setErrors((prev) => ({ ...prev, images: '' }))
                }}
                options={options}
                error={errors.images}
              />
            </section>

            {/* ----- Tài liệu tham khảo ----- */}
            <section className="paper__section">
              <h2>Tài liệu tham khảo</h2>
              <TextField
                label="Mỗi dòng một nguồn"
                multiline
                rows={4}
                counter={5000}
                placeholder={'Ví dụ:\nTổ chức Y tế Thế giới (2021). Hướng dẫn chất lượng không khí.\nNguyễn Văn A (2024). Tên bài báo. Tạp chí ..., số 12.'}
                value={doc.references}
                onChange={setField('references')}
                error={errors.references}
              />
            </section>
          </article>
        </div>

        {/* ===== Cột phải ===== */}
        <aside className="research-side">
          <section className="side-card">
            <h3>
              <Icon name="info" size={16} />
              Thông tin bài viết
            </h3>
            <SelectField
              label="Lĩnh vực"
              placeholder="Chọn lĩnh vực"
              options={options.fields.map((name) => ({ value: name, label: name }))}
              value={doc.field}
              onChange={setField('field')}
              error={errors.field}
            />
            <TextField
              label="Từ khoá"
              placeholder="bụi mịn, chất lượng không khí"
              hint="Ngăn cách bằng dấu phẩy."
              maxLength={255}
              value={doc.keywords}
              onChange={setField('keywords')}
              error={errors.keywords}
            />
          </section>

          <section className="side-card">
            <h3>
              <Icon name="shield" size={16} />
              Xung đột lợi ích
            </h3>
            <div className="conflict-options" role="radiogroup" aria-label="Xung đột lợi ích">
              {[
                ['NO', 'Không có xung đột lợi ích'],
                ['YES', 'Có liên quan cần khai báo'],
              ].map(([value, label]) => (
                <label key={value} className={doc.hasConflict === value ? 'is-selected' : ''}>
                  <input type="radio" name="hasConflict" value={value} checked={doc.hasConflict === value} onChange={setField('hasConflict')} />
                  {label}
                </label>
              ))}
            </div>
            {errors.hasConflict && <p className="field__error">{errors.hasConflict}</p>}
            {doc.hasConflict === 'YES' && (
              <TextField
                label="Mô tả"
                multiline
                rows={3}
                placeholder="Ví dụ: tác giả nhận tài trợ từ..., là thành viên của..."
                value={doc.conflictNote}
                onChange={setField('conflictNote')}
                error={errors.conflictNote}
              />
            )}
          </section>

          <section className="side-card" ref={checklistRef}>
            <h3>
              <Icon name="checkCircle" size={16} />
              Kiểm tra trước khi nộp
            </h3>
            <div className="ready-bar" aria-hidden="true">
              <span style={{ width: `${(readyCount / checklist.length) * 100}%` }} />
            </div>
            <p className="ready-bar__text">
              Đạt {readyCount}/{checklist.length} mục
            </p>
            <ul className="ready-list">
              {checklist.map((item) => (
                <li key={item.key} className={item.done ? 'is-done' : ''}>
                  <Icon name={item.done ? 'checkCircle' : 'alertCircle'} size={15} />
                  {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="side-card side-card--tips">
            <h3>
              <Icon name="edit" size={16} />
              Mẹo soạn thảo
            </h3>
            <ul>
              <li>
                <code>Ctrl + S</code> để lưu nháp nhanh.
              </li>
              <li>
                <code>## Tiêu đề</code> tạo tiêu đề mục.
              </li>
              <li>
                <code>- nội dung</code> tạo gạch đầu dòng.
              </li>
              <li>
                <code>**chữ**</code> để in đậm.
              </li>
            </ul>
          </section>
        </aside>
      </main>

      <ConfirmDialog
        open={confirming}
        title="Nộp bài nghiên cứu"
        message="Bằng việc nộp bài, bạn cam kết bài viết là của mình, mọi số liệu và hình ảnh đã được trích dẫn nguồn đầy đủ. Sau khi nộp, bài sẽ bị khoá chỉnh sửa."
        confirmLabel="Cam kết và nộp bài"
        onConfirm={() => save('SUBMIT')}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

export default ResearchEditor
