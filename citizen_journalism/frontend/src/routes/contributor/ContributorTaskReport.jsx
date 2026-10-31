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
import { REPORT_CONCLUSIONS, REPORT_RECOMMENDATIONS } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { toPayload } from '../../lib/payload'
import { createValidator, rules } from '../../lib/validators'
import { contributorTaskService } from '../../services/contributorTaskService'
import { submissionService } from '../../services/submissionService'
import '../../assets/styles/assignment.css'
import '../../assets/styles/tracking.css' // Thẻ .detail-card

/*
 * VIẾT VÀ NỘP BÁO CÁO HIỆN TRƯỜNG — /contributor/tasks/:id/report, chỉ Cộng tác viên đang làm nhiệm vụ đó.
 * Mở từ nút "Viết báo cáo" ở ContributorTaskDetail.
 * Luồng: form này -> contributorTaskService.submitReport -> ContributorTaskController -> ContributorTaskService.
 *
 * Gồm 3 phần: kết quả xác minh (kết luận, kết quả hiện trường, lời nhân chứng, đề xuất), tư liệu hiện trường
 * (ít nhất 1 tệp), bài viết nháp. Nộp xong nhiệm vụ hoàn thành và không sửa được nữa, nên quay về trang chi tiết.
 */

const validate = createValidator({
  conclusion: [rules.required('Vui lòng chọn kết luận xác minh.')],
  findings: [
    rules.required('Vui lòng nhập kết quả tại hiện trường.'),
    rules.minLength(20, 'Kết quả tại hiện trường tối thiểu 20 ký tự.'),
    rules.maxLength(2000, 'Kết quả tại hiện trường tối đa 2000 ký tự.'),
  ],
  witnessStatements: [rules.required('Vui lòng nhập lời nhân chứng.'), rules.maxLength(2000, 'Lời nhân chứng tối đa 2000 ký tự.')],
  recommendation: [rules.required('Vui lòng chọn đề xuất.')],
  files: [(files) => (files.length > 0 ? '' : 'Vui lòng đính kèm ít nhất 1 tệp tư liệu.')],
  title: [rules.required('Vui lòng nhập tiêu đề bài viết.'), rules.maxLength(250, 'Tiêu đề tối đa 250 ký tự.')],
  content: [
    rules.required('Vui lòng nhập nội dung bài viết.'),
    rules.minLength(50, 'Nội dung bài viết tối thiểu 50 ký tự.'),
    rules.maxLength(50000, 'Nội dung bài viết tối đa 50000 ký tự.'),
  ],
})

function ContributorTaskReport() {
  useDocumentTitle('Báo cáo hiện trường')
  const { id } = useParams()
  const { data: task, error } = useAsyncData(() => contributorTaskService.get(id), id)
  const { data: options, error: optionsError } = useAsyncData(() => submissionService.getOptions(), 'submission-options')
  const backLink = { to: `/contributor/tasks/${id}`, label: 'Chi tiết nhiệm vụ' }
  const loadError = error || optionsError

  return (
    <AccountLayout title="Báo cáo hiện trường" subtitle={task?.title} backLink={backLink}>
      <Alert type="error">{loadError}</Alert>
      {!loadError && (!task || !options) && <div className="skeleton skeleton--page" aria-busy="true" aria-label="Đang tải" />}
      {task && options && task.status !== 'ACCEPTED' && <Alert type="info">Nhiệm vụ này không còn nhận báo cáo.</Alert>}
      {task?.status === 'ACCEPTED' && options && <ReportForm task={task} options={options} />}
    </AccountLayout>
  )
}

/** Form tách riêng để useForm nhận tiêu đề gợi ý SAU khi tải xong nhiệm vụ. */
function ReportForm({ task, options }) {
  const navigate = useNavigate()
  const form = useForm(
    { conclusion: '', findings: '', witnessStatements: '', recommendation: '', files: [], title: task.title, content: '' },
    validate,
  )

  const submit = form.handleSubmit(async ({ files, ...values }) => {
    const response = await contributorTaskService.submitReport(task.id, toPayload(values), files.map((item) => item.file))
    navigate(`/contributor/tasks/${task.id}`, { state: { notice: response.message } })
  })

  return (
    <form className="report-form-page" noValidate onSubmit={submit}>
      <Alert type="error">{form.formError}</Alert>

      <section className="detail-card">
        <h3>Kết quả xác minh</h3>
        <p className="report-deadline">
          <Icon name="clock" size={15} />
          Hạn hoàn thành {formatDateTime(task.deadline)}. Nộp đúng hạn được cộng điểm hiệu suất, trễ hạn bị trừ điểm.
        </p>
        <ChoiceGroup label="Kết luận xác minh" name="conclusion" options={REPORT_CONCLUSIONS} form={form} />
        <TextField
          label="Kết quả tại hiện trường"
          required
          multiline
          rows={5}
          counter={2000}
          placeholder="Bạn đã quan sát và xác minh được những gì tại hiện trường?"
          {...form.field('findings')}
        />
        <TextField
          label="Lời nhân chứng"
          required
          multiline
          rows={4}
          counter={2000}
          placeholder="Tóm tắt lời người dân, ý kiến của chính quyền địa phương, trích dẫn tài liệu"
          {...form.field('witnessStatements')}
        />
        <ChoiceGroup label="Đề xuất cho toà soạn" name="recommendation" options={REPORT_RECOMMENDATIONS} form={form} />
      </section>

      <section className="detail-card">
        <h3>
          Tư liệu hiện trường<span className="field__required" aria-hidden="true">*</span>
        </h3>
        <p className="field__hint">Ảnh, video, ghi âm, tài liệu bạn thu thập được. Chỉ toà soạn xem được, người gửi tin không thấy.</p>
        <EvidenceUploader
          files={form.values.files}
          onChange={(files) => form.setValue('files', files)}
          options={options}
          error={form.errorOf('files')}
        />
      </section>

      <section className="detail-card">
        <h3>Bài viết nháp</h3>
        <TextField label="Tiêu đề" required maxLength={250} {...form.field('title')} />
        <TextField
          label="Nội dung"
          required
          multiline
          rows={12}
          counter={50000}
          placeholder="Viết bài từ những gì bạn ghi nhận tại hiện trường, Biên tập viên sẽ biên tập trước khi đăng."
          {...form.field('content')}
        />
      </section>

      <div className="report-form-page__actions">
        <Button to={`/contributor/tasks/${task.id}`} variant="secondary">
          Quay lại
        </Button>
        <Button type="submit" loading={form.submitting}>
          <Icon name="send" size={16} />
          Nộp báo cáo
        </Button>
      </div>
    </form>
  )
}

/** Nhóm lựa chọn 1 trong nhiều (radio) hiển thị dạng các ô bấm. */
function ChoiceGroup({ label, name, options, form }) {
  const error = form.errorOf(name)
  return (
    <fieldset className={`report-choices ${error ? 'field--error' : ''}`}>
      <legend className="field__label">
        {label}
        <span className="field__required" aria-hidden="true">*</span>
      </legend>
      <div className="report-choices__list">
        {options.map((option) => (
          <label key={option.value} className={form.values[name] === option.value ? 'is-selected' : ''}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={form.values[name] === option.value}
              onChange={() => form.setValue(name, option.value)}
            />
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </label>
        ))}
      </div>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default ContributorTaskReport
