import { useForm } from '../../hooks/useForm'
import { createValidator, rules } from '../../lib/validators'
import { VIOLATION_SEVERITY_OPTIONS, VIOLATION_TYPE_OPTIONS } from '../../lib/violations'
import { violationService } from '../../services/violationService'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'

const INITIAL = {
  userId: '',
  trackingCode: '',
  type: 'POLICY_VIOLATION',
  severity: 'MEDIUM',
  description: '',
  evidenceNote: '',
}

const validate = createValidator({
  userId: [rules.required('Vui lòng nhập mã tài khoản.')],
  type: [rules.required('Vui lòng chọn loại vi phạm.')],
  severity: [rules.required('Vui lòng chọn mức độ.')],
  description: [
    rules.required('Vui lòng mô tả vi phạm.'),
    rules.minLength(20, 'Mô tả tối thiểu 20 ký tự.'),
    rules.maxLength(3000, 'Mô tả tối đa 3000 ký tự.'),
  ],
  evidenceNote: [rules.optional(rules.maxLength(2000, 'Ghi chú chứng cứ tối đa 2000 ký tự.'))],
})

function CreateViolationDialog({ open, onClose, onCreated }) {
  const form = useForm(INITIAL, validate)
  const close = () => {
    form.reset(INITIAL)
    onClose()
  }
  const submit = form.handleSubmit(async (values) => {
    const response = await violationService.create({
      ...values,
      userId: values.userId.trim().toUpperCase(),
      trackingCode: values.trackingCode.trim().toUpperCase() || null,
      evidenceNote: values.evidenceNote.trim() || null,
    })
    onCreated(response.data, response.message)
    close()
  })

  return (
    <Modal open={open} title="Lập báo cáo vi phạm" onClose={close}>
      <form className="form" onSubmit={submit} noValidate>
        <Alert type="error">{form.formError}</Alert>
        <div className="form__row">
          <TextField label="Mã tài khoản" placeholder="VD: CT0001" required {...form.field('userId')} />
          <TextField
            label="Mã hồ sơ liên quan"
            placeholder="Không bắt buộc"
            hint="Cần nhập nếu đề xuất gỡ nội dung."
            {...form.field('trackingCode')}
          />
        </div>
        <div className="form__row">
          <SelectField label="Loại vi phạm" options={VIOLATION_TYPE_OPTIONS} required {...form.field('type')} />
          <SelectField label="Mức độ" options={VIOLATION_SEVERITY_OPTIONS} required {...form.field('severity')} />
        </div>
        <TextField label="Mô tả vi phạm" multiline rows={5} counter={3000} required {...form.field('description')} />
        <TextField
          label="Ghi chú chứng cứ"
          multiline
          rows={3}
          counter={2000}
          hint="Nêu nguồn, thời điểm và cách đối chiếu chứng cứ."
          {...form.field('evidenceNote')}
        />
        <div className="modal__actions">
          <Button variant="secondary" onClick={close} disabled={form.submitting}>Huỷ</Button>
          <Button type="submit" loading={form.submitting}>Tạo báo cáo</Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateViolationDialog
