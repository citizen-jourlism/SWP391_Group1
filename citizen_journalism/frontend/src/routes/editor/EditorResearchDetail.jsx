import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  PRIORITY_INFO,
  REVISION_STATUS,
  evaluatePriority,
  optionLabel,
  reviewStatusInfo,
} from '../../lib/researchEditorial'
import { createValidator, rules } from '../../lib/validators'
import { editorService } from '../../services/editorService'
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
 *   - "Duyệt": form chấm phân loại (ApproveResearchDialog cuối file này, tiêu chuẩn ở lib/researchEditorial.js)
 *     -> chuyển Phó TBT phụ trách lĩnh vực. Bị chặn khi lĩnh vực chưa có Phó TBT / đang chờ Chuyên gia phản hồi.
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

  return (
    <div className="desk-detail">
      <Link to="/editor/queue" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hàng đợi tin bài
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {!data && !error && <div className="skeleton skeleton--page" />}

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
      {/* Chưa duyệt được (chưa có Phó TBT phụ trách / đang chờ Chuyên gia phản hồi): nói rõ lý do */}
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

      {approval && (
        <ApproveResearchDialog
          open={approving}
          field={article.field}
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

/** Kết quả Duyệt / Từ chối đã lưu: ai, lúc nào, chuyển Phó TBT nào, điểm từng tiêu chí, cấp độ, ghi chú / lý do. */
function ReviewResultPanel({ result }) {
  const status = reviewStatusInfo(result.status)
  const priority = result.priority && PRIORITY_INFO[result.priority]
  const approved = result.status === 'DEPUTY_PENDING'
  return (
    <section className={`admin-panel review-result ${approved ? '' : 'review-result--rejected'}`}>
      <div className="review-result__head">
        <Badge tone={status.tone}>{status.label}</Badge>
        {priority && <Badge tone={priority.tone}>{priority.label}</Badge>}
        <small>
          {result.reviewerName} · {formatDateTime(result.reviewedAt)}
        </small>
      </div>
      {approved ? (
        <>
          <p>
            Đã chuyển tới <b>Phó TBT {result.deputyName}</b>. Tổng điểm phân loại <b>{result.impactScore}/10</b>:
          </p>
          <ul className="review-result__scores">
            <li>Lĩnh vực: {result.fieldScore} điểm</li>
            <li>Xung đột lợi ích: {optionLabel(CONFLICT_OPTIONS, result.conflict)}</li>
            <li>Nhắc đến cá nhân / tổ chức: {optionLabel(MENTION_OPTIONS, result.mention)}</li>
          </ul>
          {result.note && (
            <p className="review-result__note">
              <b>Ghi chú cho Phó TBT:</b> {result.note}
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
  conflict: [rules.required('Vui lòng chọn mức xung đột lợi ích.')],
  mention: [rules.required('Vui lòng chọn mức nhắc đến cá nhân / tổ chức.')],
  note: [rules.maxLength(2000, 'Ghi chú tối đa 2000 ký tự.')],
})

/**
 * FORM "DUYỆT VÀ CHUYỂN PHÓ TBT". BTV chấm 3 tiêu chí:
 *   1. Lĩnh vực: tự động (approval.fieldScore do backend tính sẵn)
 *   2. Xung đột lợi ích: chọn sẵn theo khai báo của tác giả, BTV sửa nếu thấy khác
 *   3. Nhắc đến cá nhân / tổ chức: BTV bắt buộc chọn
 * Tổng điểm + cấp độ (Low / Medium / High) cập nhật ngay khi chọn; BTV không tự đổi cấp độ.
 * onSubmit: async ({ conflict, mention, note }) => ...  lỗi backend tự hiện trong hộp thoại.
 */
function ApproveResearchDialog({ open, onClose, field, approval, onSubmit }) {
  const form = useForm({ conflict: approval.suggestedConflict ?? '', mention: '', note: '' }, validateApproval)
  const result = evaluatePriority(approval.fieldScore, form.values.conflict, form.values.mention)
  const priority = result && PRIORITY_INFO[result.priority]

  const close = () => {
    form.reset()
    onClose()
  }

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    close()
  })

  return (
    <Modal open={open} title="Duyệt và chuyển Phó Tổng biên tập" onClose={close}>
      <form onSubmit={submit} className="revision-form" noValidate>
        <Alert type="error">{form.formError}</Alert>

        <div className="rubric-item">
          <div className="rubric-item__head">
            <strong>1. Lĩnh vực</strong>
            <span>{field || 'Chưa chọn'}</span>
          </div>
          <p className="rubric-item__auto">
            {approval.fieldScore} điểm <small>(hệ thống tự chấm theo độ nhạy cảm của lĩnh vực)</small>
          </p>
        </div>

        <RubricGroup
          title="2. Xung đột lợi ích"
          name="conflict"
          options={CONFLICT_OPTIONS}
          value={form.values.conflict}
          error={form.errorOf('conflict')}
          onChange={(value) => form.setValue('conflict', value)}
        />
        <RubricGroup
          title="3. Nhắc đến / công kích cá nhân, tổ chức cụ thể"
          name="mention"
          options={MENTION_OPTIONS}
          value={form.values.mention}
          error={form.errorOf('mention')}
          onChange={(value) => form.setValue('mention', value)}
        />

        <TextField label="Ghi chú cho Phó TBT (không bắt buộc)" multiline rows={3} counter={2000} {...form.field('note')} />

        <div className="rubric-total">
          <span>
            Tổng điểm: <b>{result ? `${result.total}/10` : '—'}</b>
          </span>
          <span>
            Cấp độ: {priority ? <Badge tone={priority.tone}>{priority.label}</Badge> : <small>Chọn đủ các tiêu chí</small>}
          </span>
          {priority && <small className="rubric-total__hint">{priority.hint}</small>}
        </div>
        <p className="rubric-deputy">
          Chuyển tới: <b>Phó TBT {approval.deputyName}</b> (phụ trách lĩnh vực {field})
        </p>

        <div className="modal__actions">
          <Button variant="secondary" onClick={close} disabled={form.submitting}>
            Huỷ
          </Button>
          <Button type="submit" loading={form.submitting}>
            Duyệt và chuyển
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** 1 nhóm lựa chọn (chọn 1), mỗi lựa chọn có điểm + gợi ý khi nào chọn. */
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
              {option.label} <em>({option.score} điểm)</em>
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
