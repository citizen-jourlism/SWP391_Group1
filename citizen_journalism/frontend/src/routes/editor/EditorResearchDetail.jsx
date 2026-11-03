import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LeadershipNotes } from '../../components/leadership/LeadershipDecision'
import { ReasonDialog, RevisionComments, RevisionDiff, RevisionVersions } from '../../components/research/ResearchEditorial'
import ResearchReader from '../../components/research/ResearchReader'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import { formatDateTime } from '../../lib/format'
import {
  CONFLICT_OPTIONS,
  MENTION_OPTIONS,
  POLITICAL_OPTIONS,
  REVISION_STATUS,
  SCOPE_OPTIONS,
  URGENCY_OPTIONS,
  editorReviewInfo,
  optionLabel,
} from '../../lib/researchEditorial'
import { createValidator, rules } from '../../lib/validators'
import { editorService } from '../../services/editorService'
import { leadershipService } from '../../services/leadershipService'
import '../../assets/styles/leadership.css' // Khung "Ý kiến của Ban biên tập"
import '../../assets/styles/research.css' // Kiểu trình bày bài (.paper, .article-body...) của ResearchReader
import '../../assets/styles/revision.css' // Form sửa bài + khung xem thay đổi

/*
 * CHI TIẾT 1 BÀI NGHIÊN CỨU TRONG HÀNG ĐỢI — /editor/queue/research/:id (Biên tập viên).
 * Luồng: nút "Mở" ở EditorQueue -> trang này -> editorService.getResearch -> GET /api/editor/research/{id}
 *        (ResearchEditorialController -> ResearchEditorialService.getDetail). Chỉ bài ĐÃ NỘP mới xem được, bản nháp -> 404.
 *
 * Nội dung bài hiển thị bằng ResearchReader (dùng chung với trang Chuyên gia xem bài đã nộp).
 * Các khối RevisionDiff / RevisionVersions / RevisionComments / ReasonDialog nằm ở components/research/ResearchEditorial.jsx.
 *
 * YÊU CẦU CHỈNH SỬA:
 *   1. Bấm "Sửa bài" -> form sửa tiêu đề / tóm tắt / từ khoá / nội dung + khung "Xem thay đổi"
 *      (chữ thêm vào highlight vàng, chữ xoá gạch ngang đỏ — RevisionDiff).
 *   2. Có thay đổi thì bấm "Yêu cầu chỉnh sửa" -> hộp xác nhận -> editorService.requestRevision
 *      -> POST /api/editor/research/{id}/revision-requests: lưu yêu cầu + email báo tác giả.
 *   3. Bài gốc giữ nguyên; trang chuyển sang "Đang chờ Chuyên gia phản hồi": xem các phiên bản (RevisionVersions)
 *      và trao đổi với Chuyên gia (RevisionComments -> editorService.commentRevision).
 *   4. Chuyên gia đồng ý / từ chối (trang ExpertRevisionReview) -> yêu cầu chuyển vào "Lịch sử chỉnh sửa", vẫn xem được
 *      bản gốc, bản đề xuất và bản sau chỉnh sửa; Biên tập viên có thể gửi yêu cầu mới.
 *
 * DUYỆT / TỪ CHỐI BÀI:
 *   - "Duyệt": form chấm 6 tiêu chí (ApproveResearchDialog cuối file này, tiêu chuẩn ở lib/researchEditorial.js)
 *     -> BTV chỉ tick tiêu chí; điểm, cấp độ và nơi bài được chuyển tới do backend tự xử lý, BTV không được thấy.
 *     Bị chặn khi lĩnh vực chưa được phân công người duyệt / đang chờ Chuyên gia phản hồi / yếu tố con người ở mức chặn duyệt.
 *   - "Từ chối": nhập lý do bắt buộc (ReasonDialog) -> bài dừng xử lý, báo Chuyên gia.
 *   Đã có kết quả thì hiện ReviewResultPanel và khoá mọi thao tác.
 */

/** Kiểm tra nhanh phía trình duyệt; độ dài tối thiểu (tiêu đề, tóm tắt, số chữ) do backend kiểm tra, lỗi hiện dưới từng ô. */
const validate = createValidator({
  title: [rules.required('Vui lòng nhập tiêu đề.')],
  abstractText: [rules.required('Vui lòng nhập tóm tắt.')],
  content: [rules.required('Vui lòng nhập nội dung.')],
})

function EditorResearchDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => editorService.getResearch(id), id)
  // Ý kiến của Ban biên tập (yêu cầu chỉnh sửa / không duyệt, ghi chung "Ban biên tập") — không có thì không hiện
  const { data: leadershipNotes } = useAsyncData(() => leadershipService.researchNotes(id), `notes|${id}`)

  return (
    <div className="desk-detail">
      <Link to="/editor/queue" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hàng đợi tin bài
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {!data && !error && <div className="skeleton skeleton--page" />}
      <LeadershipNotes title="Ý kiến của Ban biên tập" notes={leadershipNotes} />

      {/* key: đổi sang bài khác thì tạo lại form từ đầu theo bài mới */}
      {data && (
        <ResearchReview
          key={data.article.id}
          detail={data}
          onRevisionChange={(revision) =>
            setData({
              ...data,
              // Yêu cầu mới -> đưa lên đầu lịch sử; yêu cầu đã có (vừa bình luận) -> thay đúng dòng đó.
              revisions: data.revisions.some((item) => item.id === revision.id)
                ? data.revisions.map((item) => (item.id === revision.id ? revision : item))
                : [revision, ...data.revisions],
            })
          }
          onReviewChange={(review) => setData({ ...data, review })}
        />
      )}
    </div>
  )
}

/** Phần chính khi đã tải xong bài: thanh thao tác + (form sửa | yêu cầu đang chờ | bài đọc). */
function ResearchReview({ detail, onRevisionChange, onReviewChange }) {
  const { article, author, revisions, review } = detail
  // Đã có kết quả Duyệt / Từ chối thì bài dừng ở BTV: khoá mọi thao tác.
  const decided = Boolean(review.result)
  const approval = review.approval
  // Yêu cầu đang chờ (nếu có) luôn ở đầu danh sách; các yêu cầu đã xử lý là lịch sử.
  const pendingRevision = revisions.find((item) => item.status === 'PENDING')
  const history = revisions.filter((item) => item.status !== 'PENDING')
  // Bài gốc: giá trị ban đầu của form và là mốc để so sánh phần thay đổi.
  const original = {
    title: article.title ?? '',
    abstractText: article.abstractText ?? '',
    keywords: article.keywords ?? '',
    content: article.content ?? '',
  }
  const form = useForm(original, validate)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [notice, setNotice] = useState('')

  /** Sau khi Duyệt / Từ chối thành công: hiện thông báo và cập nhật phần kết quả trên trang. */
  const reviewed = (response) => {
    setNotice(response.message)
    onReviewChange(response.data)
  }

  const cancelEdit = () => {
    form.reset()
    setEditing(false)
  }

  // handleSubmit tự đưa lỗi backend (theo từng ô / lỗi chung) lên form; hộp xác nhận đóng lại để thấy lỗi.
  const sendRevision = form.handleSubmit(async (values) => {
    const response = await editorService.requestRevision(article.id, values)
    form.reset()
    setEditing(false)
    setNotice(response.message)
    onRevisionChange(response.data)
  })

  const postComment = async (content) => {
    const response = await editorService.commentRevision(pendingRevision.id, content)
    onRevisionChange(response.data)
  }

  return (
    <>
      <section className="admin-panel desk-actions">
        <div>
          <strong>Duyệt bài nghiên cứu · NC-{article.id}</strong>
          {pendingRevision && (
            <small>
              Đã gửi yêu cầu chỉnh sửa lúc {formatDateTime(pendingRevision.createdAt)} — đang chờ Chuyên gia phản hồi.
            </small>
          )}
          {editing && <small>Sửa trực tiếp các ô bên dưới, phần thay đổi được highlight trong khung "Xem thay đổi".</small>}
        </div>
        <div className="desk-actions__buttons">
          {editing ? (
            <Button variant="secondary" className="btn--sm" onClick={cancelEdit}>
              <Icon name="x" size={14} />
              Huỷ sửa
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="btn--sm"
              disabled={Boolean(pendingRevision) || decided}
              onClick={() => setEditing(true)}
            >
              <Icon name="edit" size={14} />
              Sửa bài
            </Button>
          )}
          <Button
            variant="secondary"
            className="btn--sm"
            disabled={editing || decided || Boolean(approval?.blockedReason)}
            title={approval?.blockedReason ?? ''}
            onClick={() => setApproving(true)}
          >
            <Icon name="checkCircle" size={14} />
            Duyệt
          </Button>
          <Button
            variant={editing ? 'primary' : 'secondary'}
            className="btn--sm"
            disabled={!editing || !form.isDirty}
            title={editing ? (form.isDirty ? '' : 'Bạn chưa thay đổi gì') : 'Bấm "Sửa bài" để chỉnh sửa trước'}
            onClick={() => setConfirming(true)}
          >
            <Icon name="send" size={14} />
            Yêu cầu chỉnh sửa
          </Button>
          <Button
            variant="danger"
            className="btn--sm"
            disabled={editing || decided || Boolean(pendingRevision)}
            title={pendingRevision ? 'Đang chờ Chuyên gia phản hồi yêu cầu chỉnh sửa' : ''}
            onClick={() => setRejecting(true)}
          >
            <Icon name="x" size={14} />
            Từ chối
          </Button>
        </div>
      </section>

      <Alert type="success">{notice}</Alert>
      {/* Chưa duyệt được (lĩnh vực chưa có người duyệt / đang chờ Chuyên gia phản hồi): nói rõ lý do */}
      {!decided && approval?.blockedReason && <Alert type="warning">{approval.blockedReason}</Alert>}
      {decided && <ReviewResultPanel result={review.result} />}

      {editing && (
        <>
          <section className="admin-panel revision-form">
            <div className="revision-form__head">
              <h2>Chỉnh sửa bài</h2>
              <small>Bài gốc chỉ thay đổi khi Chuyên gia đồng ý với đề xuất.</small>
            </div>
            <Alert type="error">{form.formError}</Alert>
            <TextField label="Tiêu đề" required {...form.field('title')} />
            <TextField label="Tóm tắt" required multiline rows={5} {...form.field('abstractText')} />
            <TextField label="Từ khoá" hint="Ngăn cách bằng dấu phẩy." {...form.field('keywords')} />
            <TextField
              label="Nội dung"
              required
              multiline
              rows={18}
              hint='Giữ quy ước định dạng của bài: "## " tiêu đề mục, "- " gạch đầu dòng, **chữ** in đậm.'
              {...form.field('content')}
            />
          </section>

          <section className="admin-panel revision-form">
            <div className="revision-form__head">
              <h2>Xem thay đổi</h2>
            </div>
            <RevisionDiff original={original} proposed={form.values} />
          </section>
        </>
      )}

      {!editing && pendingRevision && (
        <section className="admin-panel revision-form">
          <div className="revision-form__head">
            <h2>Yêu cầu chỉnh sửa đang chờ</h2>
            <small>
              {pendingRevision.editorName} · {formatDateTime(pendingRevision.createdAt)}
            </small>
          </div>
          <RevisionVersions revision={pendingRevision} />
          <h3 className="revision-subtitle">Trao đổi với Chuyên gia</h3>
          <RevisionComments comments={pendingRevision.comments} canPost onPost={postComment} />
        </section>
      )}

      {!editing && history.length > 0 && (
        <section className="admin-panel revision-form">
          <div className="revision-form__head">
            <h2>Lịch sử chỉnh sửa ({history.length})</h2>
            <small>Bấm vào từng lần để xem bản gốc, bản đề xuất và bản sau chỉnh sửa.</small>
          </div>
          {history.map((revision) => {
            const status = REVISION_STATUS[revision.status]
            return (
              <details key={revision.id} className="revision-history">
                <summary>
                  <Badge tone={status?.tone}>{status?.label ?? revision.status}</Badge>
                  <span>
                    {revision.editorName} gửi lúc {formatDateTime(revision.createdAt)}
                    {revision.expertAdjusted && ' · Chuyên gia có điều chỉnh'}
                  </span>
                </summary>
                <RevisionVersions revision={revision} />
                <h3 className="revision-subtitle">Trao đổi</h3>
                <RevisionComments comments={revision.comments} canPost={false} />
              </details>
            )
          })}
        </section>
      )}

      {!editing && <ResearchReader article={article} author={author} />}

      <ConfirmDialog
        open={confirming}
        title="Gửi yêu cầu chỉnh sửa?"
        message={`Các chỉnh sửa sẽ được gửi cho Chuyên gia ${author.fullName} xem và phản hồi. Bài gốc giữ nguyên cho tới khi Chuyên gia đồng ý.`}
        confirmLabel="Gửi yêu cầu"
        onConfirm={sendRevision}
        onClose={() => setConfirming(false)}
      />

      {/* Bài đã được phân loại ở lần duyệt trước (Ban biên tập trả về, đã sửa) -> chỉ xác nhận duyệt lại, không chấm lại */}
      {approval?.previous && (
        <ReapproveResearchDialog
          open={approving}
          approval={approval}
          onClose={() => setApproving(false)}
          onSubmit={async (values) => reviewed(await editorService.approveResearch(article.id, values))}
        />
      )}
      {approval && !approval.previous && (
        <ApproveResearchDialog
          open={approving}
          approval={approval}
          onClose={() => setApproving(false)}
          onSubmit={async (values) => reviewed(await editorService.approveResearch(article.id, values))}
        />
      )}

      <ReasonDialog
        open={rejecting}
        title="Từ chối bài nghiên cứu"
        message={`Bài sẽ dừng xử lý và Chuyên gia ${author.fullName} nhận được thông báo kèm lý do bạn nhập.`}
        onClose={() => setRejecting(false)}
        onSubmit={async (reason) => reviewed(await editorService.rejectResearch(article.id, reason))}
      />
    </>
  )
}

/**
 * Kết quả Duyệt / Từ chối đã lưu: ai, lúc nào, các tiêu chí BTV đã tick, ghi chú / lý do.
 * KHÔNG hiện điểm, cấp độ phân loại hay bài được chuyển cho ai (backend cũng không gửi các thông tin này cho BTV).
 * Bài duyệt theo tiêu chuẩn cũ (3 tiêu chí) không có political / scope / urgency -> ẩn các dòng đó.
 */
function ReviewResultPanel({ result }) {
  const status = editorReviewInfo(result.status)
  // Bài có thể đã đi tiếp ở Ban biên tập nhưng quyết định của BTV vẫn là "Duyệt" -> chỉ REJECTED mới là BTV từ chối
  const approved = result.status !== 'REJECTED'
  return (
    <section className={`admin-panel review-result ${approved ? '' : 'review-result--rejected'}`}>
      <div className="review-result__head">
        <Badge tone={status.tone}>{status.label}</Badge>
        <small>
          {result.reviewerName} · {formatDateTime(result.reviewedAt)}
        </small>
      </div>
      {approved ? (
        <>
          <p>Các tiêu chí đã đánh giá:</p>
          <CriteriaList values={result} />
          {result.note && (
            <p className="review-result__note">
              <b>Ghi chú:</b> {result.note}
            </p>
          )}
        </>
      ) : (
        <p className="review-result__note">
          <b>Lý do từ chối:</b> {result.note}
        </p>
      )}
    </section>
  )
}

const validateApproval = createValidator({
  political: [rules.required('Vui lòng chọn mức yếu tố chính trị.')],
  mention: [rules.required('Vui lòng chọn mức yếu tố con người.')],
  scope: [rules.required('Vui lòng chọn phạm vi tác động.')],
  urgency: [rules.required('Vui lòng chọn mức khẩn cấp.')],
  conflict: [rules.required('Vui lòng chọn mức xung đột lợi ích.')],
  note: [rules.maxLength(2000, 'Ghi chú tối đa 2000 ký tự.')],
})

/** 5 nhóm tiêu chí BTV tick khi Duyệt (lĩnh vực hệ thống tự xét theo lĩnh vực của bài, BTV không chọn). */
const CRITERIA_GROUPS = [
  { title: '1. Yếu tố chính trị', name: 'political', options: POLITICAL_OPTIONS },
  { title: '2. Yếu tố con người (nêu tên, công kích, danh tính)', name: 'mention', options: MENTION_OPTIONS },
  { title: '3. Phạm vi tác động cộng đồng', name: 'scope', options: SCOPE_OPTIONS },
  { title: '4. Mức khẩn cấp, nguy hại', name: 'urgency', options: URGENCY_OPTIONS },
  { title: '5. Xung đột lợi ích', name: 'conflict', options: CONFLICT_OPTIONS },
]

/** Danh sách các tiêu chí đã tick (chỉ tên lựa chọn, không điểm). Tiêu chí không có (bài theo tiêu chuẩn cũ) thì ẩn. */
function CriteriaList({ values }) {
  return (
    <ul className="review-result__scores">
      {CRITERIA_GROUPS.filter((group) => values[group.name]).map((group) => (
        <li key={group.name}>
          {group.title.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)$/, '')}: {optionLabel(group.options, values[group.name])}
        </li>
      ))}
    </ul>
  )
}

/**
 * FORM "DUYỆT BÀI". BTV chỉ TICK 5 nhóm tiêu chí (tiêu chuẩn ở lib/researchEditorial.js, khu 4):
 * yếu tố chính trị, yếu tố con người, phạm vi tác động, mức khẩn cấp, xung đột lợi ích (chọn sẵn theo khai báo của tác giả).
 * KHÔNG hiện điểm, tổng điểm, cấp độ phân loại hay bài sẽ chuyển cho ai — hệ thống tự phân loại ở backend.
 *   - Yếu tố con người ở mức chặn duyệt -> hiện cảnh báo, khoá nút "Duyệt".
 * onSubmit: async ({ political, mention, scope, urgency, conflict, note }) => ...  lỗi backend tự hiện trong hộp thoại.
 */
function ApproveResearchDialog({ open, onClose, approval, onSubmit }) {
  const form = useForm(
    { political: '', mention: '', scope: '', urgency: '', conflict: approval.suggestedConflict ?? '', note: '' },
    validateApproval,
  )
  const blocked = Boolean(MENTION_OPTIONS.find((option) => option.value === form.values.mention)?.blocked)

  const close = () => {
    form.reset()
    onClose()
  }

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    close()
  })

  return (
    <Modal open={open} title="Duyệt bài nghiên cứu" onClose={close}>
      <form onSubmit={submit} className="revision-form" noValidate>
        <Alert type="error">{form.formError}</Alert>
        <p className="modal__text">Đánh giá bài theo các tiêu chí dưới đây (chọn 1 mục ở mỗi nhóm).</p>

        {CRITERIA_GROUPS.map((group) => (
          <RubricGroup
            key={group.name}
            title={group.title}
            name={group.name}
            options={group.options}
            value={form.values[group.name]}
            error={form.errorOf(group.name)}
            onChange={(value) => form.setValue(group.name, value)}
          />
        ))}

        <TextField label="Ghi chú (không bắt buộc)" multiline rows={3} counter={2000} {...form.field('note')} />

        {blocked && (
          <Alert type="warning">
            Bài vi phạm tiêu chuẩn về yếu tố con người nên không được duyệt. Hãy đóng hộp thoại này rồi bấm "Sửa bài" để gửi yêu cầu
            chỉnh sửa cho Chuyên gia, hoặc bấm "Từ chối".
          </Alert>
        )}

        <div className="modal__actions">
          <Button variant="secondary" onClick={close} disabled={form.submitting}>
            Huỷ
          </Button>
          <Button type="submit" loading={form.submitting} disabled={blocked}>
            Duyệt
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Hộp DUYỆT LẠI cho bài đã được đánh giá (approval.previous): bài bị trả về, đã sửa xong nộp lại.
 * Không đánh giá lại — chỉ hiện các tiêu chí đã tick lần trước (không điểm / cấp độ), BTV ghi chú (không bắt buộc) rồi duyệt.
 * Gửi kèm đúng các lựa chọn cũ cho đủ dữ liệu; backend vẫn tự lấy lại kết quả cũ (ResearchEditorialService.approve).
 */
function ReapproveResearchDialog({ open, onClose, approval, onSubmit }) {
  const previous = approval.previous
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const close = () => {
    setNote('')
    setError('')
    onClose()
  }

  const submit = async (event) => {
    event.preventDefault()
    setRunning(true)
    setError('')
    try {
      const { political, mention, scope, urgency, conflict } = previous
      await onSubmit({ political, mention, scope, urgency, conflict, note: note.trim() || null })
      close()
    } catch (err) {
      setError(err.errors?.note || err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} title="Duyệt lại bài nghiên cứu" onClose={close}>
      <form onSubmit={submit} className="revision-form" noValidate>
        <p className="modal__text">
          Bài đã được đánh giá ở lần duyệt trước nên <b>không cần đánh giá lại</b>. Các tiêu chí đã chọn:
        </p>
        <CriteriaList values={previous} />
        <TextField
          label="Ghi chú (không bắt buộc)"
          multiline
          rows={3}
          counter={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Alert type="error">{error}</Alert>
        <div className="modal__actions">
          <Button variant="secondary" onClick={close} disabled={running}>
            Huỷ
          </Button>
          <Button type="submit" loading={running}>
            Duyệt
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** 1 nhóm lựa chọn (chọn 1), mỗi lựa chọn có gợi ý khi nào chọn. Không hiện điểm của lựa chọn. */
function RubricGroup({ title, name, options, value, error, onChange }) {
  return (
    <fieldset className="rubric-item">
      <legend className="rubric-item__head">
        <strong>{title}</strong>
      </legend>
      {options.map((option) => (
        <label key={option.value} className={`rubric-option ${value === option.value ? 'is-checked' : ''}`}>
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
          <span>
            <b>
              {option.label} {option.blocked && <em>(không được duyệt)</em>}
            </b>
            <small>{option.hint}</small>
          </span>
        </label>
      ))}
      {error && <p className="field__error">{error}</p>}
    </fieldset>
  )
}

export default EditorResearchDetail
