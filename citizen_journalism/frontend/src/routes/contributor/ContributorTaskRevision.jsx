import { useNavigate, useParams } from 'react-router-dom'
import AccountLayout from '../../components/layout/AccountLayout'
import EvidenceUploader from '../../components/submission/EvidenceUploader'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useForm } from '../../hooks/useForm'
import { FEEDBACK_TYPES, openFeedback } from '../../lib/assignment'
import { toPayload } from '../../lib/payload'
import { createValidator, rules } from '../../lib/validators'
import { contributorTaskService } from '../../services/contributorTaskService'
import { submissionService } from '../../services/submissionService'
import '../../assets/styles/assignment.css'
import '../../assets/styles/tracking.css' // Thẻ .detail-card

/*
 * XỬ LÝ YÊU CẦU CỦA BIÊN TẬP VIÊN — /contributor/tasks/:id/revise, chỉ Cộng tác viên của nhiệm vụ đó.
 * Mở từ nút trong ô phản hồi ở ContributorTaskDetail. Nội dung trang tuỳ theo yêu cầu đang chờ:
 *   - Yêu cầu sửa bài       : form sửa tiêu đề + nội dung bài viết (PUT .../report/article).
 *   - Yêu cầu bổ sung tư liệu: khu tải tệp (POST .../report/evidence).
 * Xử lý xong quay về trang chi tiết, báo cáo trở lại chờ Biên tập viên xem. Không có yêu cầu nào thì không sửa được.
 */

const NOTE_RULES = [rules.optional(rules.maxLength(1000, 'Lời nhắn tối đa 1000 ký tự.'))]

const validateArticle = createValidator({
  title: [rules.required('Vui lòng nhập tiêu đề bài viết.'), rules.maxLength(250, 'Tiêu đề tối đa 250 ký tự.')],
  content: [
    rules.required('Vui lòng nhập nội dung bài viết.'),
    rules.minLength(50, 'Nội dung bài viết tối thiểu 50 ký tự.'),
    rules.maxLength(50000, 'Nội dung bài viết tối đa 50000 ký tự.'),
  ],
  note: NOTE_RULES,
})

const validateEvidence = createValidator({
  files: [(files) => (files.length > 0 ? '' : 'Vui lòng đính kèm ít nhất 1 tệp tư liệu.')],
  note: NOTE_RULES,
})

function ContributorTaskRevision() {
  useDocumentTitle('Xử lý yêu cầu của toà soạn')
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: task, error } = useAsyncData(() => contributorTaskService.get(id), id)
  const feedback = openFeedback(task?.report)

  /** Xong thì về trang chi tiết kèm thông báo. */
  const finish = (response) => navigate(`/contributor/tasks/${id}`, { state: { notice: response.message } })

  return (
    <AccountLayout
      title="Xử lý yêu cầu của toà soạn"
      subtitle={task?.title}
      backLink={{ to: `/contributor/tasks/${id}`, label: 'Chi tiết nhiệm vụ' }}
    >
      <Alert type="error">{error}</Alert>
      {!task && !error && <div className="skeleton skeleton--page" aria-busy="true" aria-label="Đang tải" />}
      {task && !feedback && <Alert type="info">Hiện không có yêu cầu nào từ toà soạn.</Alert>}

      {feedback && (
        <div className="report-form-page">
          <Alert type="warning" title={`${FEEDBACK_TYPES[feedback.type].label} (${feedback.editorName})`}>
            {feedback.message}
          </Alert>
          {feedback.type === 'REQUEST_REVISION' ? (
            <ArticleForm id={id} report={task.report} onDone={finish} />
          ) : (
            <EvidenceForm id={id} onDone={finish} />
          )}
        </div>
      )}
    </AccountLayout>
  )
}

/** Sửa bài viết: mở sẵn bản hiện tại. */
function ArticleForm({ id, report, onDone }) {
  const form = useForm({ title: report.title, content: report.content, note: '' }, validateArticle)

  const submit = form.handleSubmit(async (values) => {
    onDone(await contributorTaskService.updateArticle(id, toPayload(values)))
  })

  return (
    <form className="detail-card report-revision" noValidate onSubmit={submit}>
      <h3>Bài viết</h3>
      <Alert type="error">{form.formError}</Alert>
      <TextField label="Tiêu đề" required maxLength={250} {...form.field('title')} />
      <TextField label="Nội dung" required multiline rows={14} counter={50000} {...form.field('content')} />
      <TextField
        label="Lời nhắn gửi Biên tập viên"
        multiline
        rows={3}
        counter={1000}
        placeholder="Bạn đã sửa những gì?"
        {...form.field('note')}
      />
      <div className="report-form-page__actions">
        <Button type="submit" loading={form.submitting}>
          <Icon name="send" size={16} />
          Gửi lại bài viết
        </Button>
      </div>
    </form>
  )
}

/** Bổ sung tư liệu: chọn tệp + lời nhắn. Giới hạn tệp lấy từ backend. */
function EvidenceForm({ id, onDone }) {
  const { data: options, error } = useAsyncData(() => submissionService.getOptions(), 'submission-options')
  const form = useForm({ files: [], note: '' }, validateEvidence)

  const submit = form.handleSubmit(async ({ files, ...values }) => {
    onDone(await contributorTaskService.addEvidence(id, toPayload(values), files.map((item) => item.file)))
  })

  if (error) return <Alert type="error">{error}</Alert>
  if (!options) return <div className="skeleton skeleton--card" aria-busy="true" aria-label="Đang tải" />

  return (
    <form className="detail-card report-revision" noValidate onSubmit={submit}>
      <h3>
        Tư liệu bổ sung<span className="field__required" aria-hidden="true">*</span>
      </h3>
      <Alert type="error">{form.formError}</Alert>
      <EvidenceUploader
        files={form.values.files}
        onChange={(files) => form.setValue('files', files)}
        options={options}
        error={form.errorOf('files')}
      />
      <TextField label="Lời nhắn gửi Biên tập viên" multiline rows={3} counter={1000} {...form.field('note')} />
      <div className="report-form-page__actions">
        <Button type="submit" loading={form.submitting}>
          <Icon name="upload" size={16} />
          Gửi tư liệu bổ sung
        </Button>
      </div>
    </form>
  )
}

export default ContributorTaskRevision
