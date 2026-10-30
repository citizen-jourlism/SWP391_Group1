import { useState } from 'react'
import { Link } from 'react-router-dom'
import ArticleBody from './ArticleBody'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import TextField from '../ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import { formatDateTime } from '../../lib/format'
import { COMMENT_ROLE, REVISION_STATUS, diffWords } from '../../lib/researchEditorial'
import { createValidator, rules } from '../../lib/validators'
import { researchService } from '../../services/researchService'
import '../../assets/styles/research.css' // .segmented (thanh tab) + .article-body (nội dung bài)
import '../../assets/styles/revision.css'

/*
 * CÁC KHỐI GIAO DIỆN DÙNG CHUNG của luồng biên tập bài nghiên cứu.
 *
 *   Dùng ở trang Biên tập viên (routes/editor/EditorResearchDetail) VÀ Chuyên gia (routes/ExpertRevisionReview):
 *     - RevisionDiff      : khung "Xem thay đổi" — chữ thêm highlight vàng, chữ xoá gạch đỏ
 *     - RevisionVersions  : các tab Thay đổi / Bản gốc / Bản BTV đề xuất / Bản sau chỉnh sửa
 *     - RevisionComments  : khung trao đổi + ô viết bình luận
 *     - ReasonDialog      : hộp nhập lý do bắt buộc trước khi từ chối
 *   Dùng ở trang "Bài nghiên cứu của tôi" (routes/ResearchList) của Chuyên gia:
 *     - PendingRevisionsBanner : yêu cầu chỉnh sửa đang chờ + lịch sử chỉnh sửa
 *     - ReviewResultNote       : khung kết quả duyệt nằm trong thẻ bài
 *
 * Mọi chữ người dùng nhập hiển thị bằng thẻ React thường (không dangerouslySetInnerHTML) nên không chạy được mã.
 */

const FIELDS = [
  { key: 'title', label: 'Tiêu đề' },
  { key: 'abstractText', label: 'Tóm tắt' },
  { key: 'keywords', label: 'Từ khoá' },
  { key: 'content', label: 'Nội dung' },
]

/** So sánh 4 ô của 2 phiên bản. original / proposed: { title, abstractText, keywords, content }. Ô không đổi chỉ hiện nhãn. */
export function RevisionDiff({ original, proposed }) {
  return (
    <div className="revision-diff">
      <p className="revision-diff__legend">
        <ins className="diff-add">Chữ thêm vào</ins>
        <del className="diff-del">Chữ bị xoá</del>
      </p>
      {FIELDS.map(({ key, label }) => {
        const before = original[key] ?? ''
        const after = proposed[key] ?? ''
        const changed = before.trim() !== after.trim()
        return (
          <section key={key} className="revision-diff__field">
            <h3>
              {label}
              {changed ? <Badge tone="orange">Có chỉnh sửa</Badge> : <Badge>Không đổi</Badge>}
            </h3>
            {changed && (
              <div className="revision-diff__text">
                {diffWords(before.trim(), after.trim()).map((part, index) => {
                  if (part.type === 'add') return <ins key={index} className="diff-add">{part.text}</ins>
                  if (part.type === 'del') return <del key={index} className="diff-del">{part.text}</del>
                  return <span key={index}>{part.text}</span>
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

/**
 * Các phiên bản của 1 yêu cầu chỉnh sửa, dạng tab. Tab "Thay đổi" so bản gốc với bản sau chỉnh sửa (nếu Chuyên gia
 * đã đồng ý) hoặc bản BTV đề xuất. Bản gốc luôn được lưu nên xem lại được kể cả sau khi bài đã đổi.
 */
export function RevisionVersions({ revision }) {
  const [tab, setTab] = useState('changes')
  const hasFinal = Boolean(revision.finalVersion)
  const tabs = [
    { key: 'changes', label: 'Thay đổi' },
    { key: 'original', label: 'Bản gốc' },
    { key: 'proposed', label: 'Bản BTV đề xuất' },
    ...(hasFinal ? [{ key: 'final', label: 'Bản sau chỉnh sửa' }] : []),
  ]
  const shown = { original: revision.original, proposed: revision.proposed, final: revision.finalVersion }[tab]

  return (
    <div className="revision-versions">
      <div className="segmented revision-tabs" role="tablist" aria-label="Chọn phiên bản để xem">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? 'is-active' : ''}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'changes' ? (
        <>
          <p className="revision-versions__caption">
            So sánh <b>bản gốc</b> với <b>{hasFinal ? 'bản sau chỉnh sửa' : 'bản Biên tập viên đề xuất'}</b>
            {hasFinal && revision.expertAdjusted && ' (Chuyên gia đã điều chỉnh lại đề xuất trước khi đồng ý)'}.
          </p>
          <RevisionDiff original={revision.original} proposed={hasFinal ? revision.finalVersion : revision.proposed} />
        </>
      ) : (
        shown && (
          <article className="revision-version">
            <h3 className="revision-version__title">{shown.title}</h3>
            <p className="revision-version__abstract">
              <b>Tóm tắt:</b> {shown.abstractText}
            </p>
            <p className="revision-version__keywords">
              <b>Từ khoá:</b> {shown.keywords || 'Không có'}
            </p>
            <ArticleBody content={shown.content ?? ''} />
          </article>
        )
      )}
    </div>
  )
}

/**
 * Khung trao đổi. Lý do từ chối của Chuyên gia cũng nằm ở đây (rejection = true, viền đỏ).
 * canPost: yêu cầu còn chờ -> hiện ô viết. onPost: async (content) => gọi API của phía tương ứng.
 */
export function RevisionComments({ comments, canPost, onPost }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      await onPost(text.trim())
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="revision-comments">
      {comments.length === 0 && <p className="revision-comments__empty">Chưa có trao đổi nào.</p>}
      {/* Bình luận chỉ được thêm vào cuối, không sửa / xoá, nên dùng vị trí làm key là an toàn */}
      {comments.map((comment, index) => {
        const role = COMMENT_ROLE[comment.authorRole]
        return (
          <div key={index} className={`revision-comment ${comment.rejection ? 'revision-comment--rejection' : ''}`}>
            <div className="revision-comment__head">
              <strong>{comment.authorName}</strong>
              <Badge tone={role?.tone}>{role?.label ?? comment.authorRole}</Badge>
              {comment.rejection && <Badge tone="red">Lý do từ chối</Badge>}
              <small>{formatDateTime(comment.createdAt)}</small>
            </div>
            <p>{comment.content}</p>
          </div>
        )
      })}

      {canPost && (
        <form className="revision-comments__form" onSubmit={submit}>
          <TextField
            label="Viết bình luận"
            multiline
            rows={3}
            counter={2000}
            placeholder="Trao đổi về các chỉnh sửa, ví dụ giải thích vì sao nên giữ / bỏ một đoạn..."
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Alert type="error">{error}</Alert>
          <Button type="submit" className="btn--sm" loading={sending} disabled={!text.trim()}>
            <Icon name="send" size={14} />
            Gửi bình luận
          </Button>
        </form>
      )}
    </div>
  )
}

const validateReason = createValidator({
  reason: [rules.required('Vui lòng nhập lý do.'), rules.minLength(10, 'Lý do tối thiểu 10 ký tự.')],
})

/**
 * Hộp nhập LÝ DO (bắt buộc, 10–2000 ký tự) trước khi từ chối / huỷ. Dùng cho BTV từ chối bài, Chuyên gia từ chối
 * yêu cầu, Cộng tác viên từ chối / huỷ nhiệm vụ và BTV thu hồi nhiệm vụ.
 * label, confirmLabel: chữ của ô nhập và nút đồng ý.
 * onSubmit: async (reason) => ...  lỗi backend tự hiện trong hộp; thành công thì tự đóng.
 */
export function ReasonDialog({ open, title, message, label = 'Lý do từ chối', confirmLabel = 'Từ chối', onClose, onSubmit }) {
  const form = useForm({ reason: '' }, validateReason)

  const close = () => {
    form.reset()
    onClose()
  }

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values.reason)
    close()
  })

  return (
    <Modal open={open} title={title} onClose={close}>
      {/* noValidate: tắt bong bóng báo lỗi của trình duyệt, dùng thông báo tiếng Việt dưới ô */}
      <form onSubmit={submit} className="revision-form" noValidate>
        <p className="modal__text">{message}</p>
        <Alert type="error">{form.formError}</Alert>
        <TextField label={label} required multiline rows={4} counter={2000} {...form.field('reason')} />
        <div className="modal__actions">
          <Button variant="secondary" onClick={close} disabled={form.submitting}>
            Đóng
          </Button>
          <Button type="submit" variant="danger" loading={form.submitting}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Khung đầu trang "Bài nghiên cứu của tôi": yêu cầu đang chờ (nút "Xem" -> /research/revisions/:id)
 * và "Lịch sử chỉnh sửa" (bấm để mở). Không có gì để báo (hoặc tải lỗi) thì không hiện gì.
 */
export function PendingRevisionsBanner() {
  const { data } = useAsyncData(() => researchService.listRevisions(), 'my-revisions')
  if (!data?.length) return null

  const pending = data.filter((item) => item.status === 'PENDING')
  const history = data.filter((item) => item.status !== 'PENDING')

  return (
    <section className="revision-banner">
      {pending.length > 0 && (
        <div className="revision-banner__pending">
          <div className="revision-banner__title">
            <Icon name="edit" size={18} />
            <strong>Bạn có {pending.length} yêu cầu chỉnh sửa đang chờ phản hồi</strong>
          </div>
          <ul>
            {pending.map((item) => (
              <li key={item.id}>
                <span>
                  <b>{item.articleTitle}</b>
                  <small>
                    Biên tập viên {item.editorName} · {formatDateTime(item.createdAt)}
                  </small>
                </span>
                <Button to={`/research/revisions/${item.id}`} className="btn--sm">
                  Xem
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <details className="revision-banner__history">
          <summary>Lịch sử chỉnh sửa ({history.length})</summary>
          <ul>
            {history.map((item) => {
              const status = REVISION_STATUS[item.status]
              return (
                <li key={item.id}>
                  <span>
                    <b>{item.articleTitle}</b>
                    <small>
                      Biên tập viên {item.editorName} · phản hồi lúc {formatDateTime(item.respondedAt)}
                    </small>
                  </span>
                  <Badge tone={status?.tone}>{status?.label ?? item.status}</Badge>
                  <Link to={`/research/revisions/${item.id}`} className="revision-banner__link">
                    Xem bản gốc & bản sau chỉnh sửa
                  </Link>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}

/**
 * Khung KẾT QUẢ DUYỆT trong thẻ bài. result: 1 phần tử của researchService.listReviewResults (trang cha tìm theo id bài).
 * REJECTED: khung đỏ + lý do; DEPUTY_PENDING: khung xanh "Đã duyệt". Không có kết quả thì không hiện gì.
 */
export function ReviewResultNote({ result }) {
  if (!result) return null
  const rejected = result.status === 'REJECTED'

  return (
    <div className={`review-note ${rejected ? 'review-note--rejected' : 'review-note--approved'}`}>
      <div className="review-note__head">
        <Icon name={rejected ? 'alertCircle' : 'checkCircle'} size={15} />
        <strong>{rejected ? 'Bị từ chối' : 'Đã duyệt'}</strong>
        <small>
          {rejected ? 'Biên tập viên không duyệt' : 'Đã chuyển Phó Tổng biên tập xem xét'} · {formatDateTime(result.reviewedAt)}
        </small>
      </div>
      {/* Lý do giữ nguyên xuống dòng như Biên tập viên đã nhập (white-space: pre-wrap trong CSS) */}
      {rejected && result.reason && <p className="review-note__reason">Lý do: {result.reason}</p>}
    </div>
  )
}
