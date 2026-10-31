import { useState } from 'react'
import { useParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import { ReasonDialog, RevisionComments, RevisionDiff, RevisionVersions } from '../components/research/ResearchEditorial'
import Alert from '../components/ui/Alert'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Icon from '../components/ui/Icon'
import TextField from '../components/ui/TextField'
import { useAsyncData } from '../hooks/useAsyncData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { formatDateTime } from '../lib/format'
import { REVISION_STATUS, toFormValues } from '../lib/researchEditorial'
import { createValidator, rules } from '../lib/validators'
import { researchService } from '../services/researchService'
import '../assets/styles/revision.css'

/*
 * CHUYÊN GIA XỬ LÝ 1 YÊU CẦU CHỈNH SỬA — /research/revisions/:id (chỉ EXPERT, chỉ yêu cầu thuộc bài của mình).
 * Vào từ khung "Yêu cầu chỉnh sửa" trên trang Bài nghiên cứu của tôi (PendingRevisionsBanner trong
 * components/research/ResearchEditorial.jsx).
 * Luồng: trang này -> services/researchService (getRevision, commentRevision, acceptRevision, rejectRevision)
 *        -> /api/research/revisions/... (ResearchEditorialController -> ResearchEditorialService).
 *
 * Khi yêu cầu còn chờ, Chuyên gia có thể:
 *   - Xem các phiên bản (tab Thay đổi / Bản gốc / Bản BTV đề xuất) — RevisionVersions
 *   - Trao đổi, phản biện với Biên tập viên — RevisionComments
 *   - "Điều chỉnh đề xuất": sửa lại 4 ô trước khi đồng ý (khung so sánh luôn so với bản gốc)
 *   - "Đồng ý" (hộp xác nhận) -> bài được cập nhật theo bản đề xuất / bản đã điều chỉnh
 *   - "Từ chối" (bắt buộc nhập lý do) -> bài giữ nguyên
 * Đã xử lý xong thì chỉ xem lại: bản gốc luôn được lưu, có thêm tab "Bản sau chỉnh sửa" nếu đã đồng ý.
 */

/** Ô bắt buộc khi điều chỉnh; độ dài tối thiểu do backend kiểm tra (cùng ngưỡng lúc nộp bài), lỗi hiện dưới từng ô. */
const validateFinal = createValidator({
  title: [rules.required('Vui lòng nhập tiêu đề.')],
  abstractText: [rules.required('Vui lòng nhập tóm tắt.')],
  content: [rules.required('Vui lòng nhập nội dung.')],
})

function ExpertRevisionReview() {
  const { id } = useParams()
  useDocumentTitle('Yêu cầu chỉnh sửa')
  const { data, error, setData } = useAsyncData(() => researchService.getRevision(id), id)

  return (
    <AccountLayout
      title="Yêu cầu chỉnh sửa bài nghiên cứu"
      subtitle="Xem đề xuất của Biên tập viên, trao đổi rồi đồng ý hoặc từ chối. Bản gốc của bài luôn được lưu lại."
      backLink={{ to: '/research', label: 'Bài nghiên cứu của tôi' }}
    >
      <Alert type="error">{error}</Alert>
      {!data && !error && <div className="skeleton skeleton--card" />}
      {/* key: đổi sang yêu cầu khác thì tạo lại form từ đầu */}
      {data && <RevisionReview key={data.id} revision={data} onChange={setData} />}
    </AccountLayout>
  )
}

function RevisionReview({ revision, onChange }) {
  const pending = revision.status === 'PENDING'
  const status = REVISION_STATUS[revision.status]
  // Form "bản cuối": mặc định = bản Biên tập viên đề xuất; Chuyên gia có thể điều chỉnh trước khi đồng ý.
  const form = useForm(toFormValues(revision.proposed), validateFinal)
  const [adjusting, setAdjusting] = useState(false)
  const [confirmingAccept, setConfirmingAccept] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [notice, setNotice] = useState('')

  const done = (response) => {
    setAdjusting(false)
    setNotice(response.message)
    onChange(response.data)
  }

  // Lỗi backend (theo từng ô / lỗi chung) tự hiện lên form; hộp xác nhận đóng lại để thấy lỗi.
  const accept = form.handleSubmit(async (values) => done(await researchService.acceptRevision(revision.id, values)))

  const cancelAdjust = () => {
    form.reset()
    setAdjusting(false)
  }

  return (
    <div className="revision-page">
      <section className="revision-panel revision-page__head">
        <div>
          <small>NC-{revision.articleId}</small>
          <h2>{revision.articleTitle}</h2>
          <p>
            Biên tập viên <b>{revision.editorName}</b> gửi lúc {formatDateTime(revision.createdAt)}
            {revision.respondedAt && <> · phản hồi lúc {formatDateTime(revision.respondedAt)}</>}
          </p>
        </div>
        <Badge tone={status?.tone}>{status?.label ?? revision.status}</Badge>
      </section>

      {pending && (
        <section className="revision-panel revision-page__actions">
          {adjusting ? (
            <Button variant="secondary" className="btn--sm" onClick={cancelAdjust}>
              <Icon name="x" size={14} />
              Huỷ điều chỉnh
            </Button>
          ) : (
            <Button variant="secondary" className="btn--sm" onClick={() => setAdjusting(true)}>
              <Icon name="edit" size={14} />
              Điều chỉnh đề xuất
            </Button>
          )}
          <Button className="btn--sm" onClick={() => setConfirmingAccept(true)}>
            <Icon name="checkCircle" size={14} />
            Đồng ý
          </Button>
          <Button variant="danger" className="btn--sm" onClick={() => setRejecting(true)}>
            <Icon name="x" size={14} />
            Từ chối
          </Button>
        </section>
      )}

      <Alert type="success">{notice}</Alert>
      <Alert type="error">{form.formError}</Alert>

      {adjusting ? (
        <>
          <section className="revision-panel revision-form">
            <div className="revision-form__head">
              <h2>Điều chỉnh đề xuất</h2>
              <small>Sửa lại bản đề xuất theo ý bạn, rồi bấm "Đồng ý" để áp vào bài.</small>
            </div>
            <TextField label="Tiêu đề" required {...form.field('title')} />
            <TextField label="Tóm tắt" required multiline rows={5} {...form.field('abstractText')} />
            <TextField label="Từ khoá" hint="Ngăn cách bằng dấu phẩy." {...form.field('keywords')} />
            <TextField label="Nội dung" required multiline rows={18} {...form.field('content')} />
          </section>
          <section className="revision-panel revision-form">
            <div className="revision-form__head">
              <h2>Xem thay đổi so với bản gốc</h2>
            </div>
            <RevisionDiff original={revision.original} proposed={form.values} />
          </section>
        </>
      ) : (
        <section className="revision-panel">
          <RevisionVersions revision={revision} />
        </section>
      )}

      <section className="revision-panel">
        <div className="revision-form__head">
          <h2>Trao đổi với Biên tập viên</h2>
        </div>
        <RevisionComments
          comments={revision.comments}
          canPost={pending}
          onPost={async (content) => onChange((await researchService.commentRevision(revision.id, content)).data)}
        />
      </section>

      <ConfirmDialog
        open={confirmingAccept}
        title="Đồng ý chỉnh sửa?"
        message={
          adjusting && form.isDirty
            ? 'Bài nghiên cứu sẽ được cập nhật theo bản bạn vừa điều chỉnh. Bản gốc vẫn được lưu lại để xem sau.'
            : 'Bài nghiên cứu sẽ được cập nhật theo bản Biên tập viên đề xuất. Bản gốc vẫn được lưu lại để xem sau.'
        }
        confirmLabel="Đồng ý"
        onConfirm={accept}
        onClose={() => setConfirmingAccept(false)}
      />

      {/* Lý do từ chối được lưu thành 1 bình luận để Biên tập viên đọc */}
      <ReasonDialog
        open={rejecting}
        title="Từ chối yêu cầu chỉnh sửa"
        message="Bài của bạn sẽ giữ nguyên. Hãy cho Biên tập viên biết lý do để hai bên dễ trao đổi tiếp."
        onClose={() => setRejecting(false)}
        onSubmit={async (reason) => done(await researchService.rejectRevision(revision.id, reason))}
      />
    </div>
  )
}

export default ExpertRevisionReview
