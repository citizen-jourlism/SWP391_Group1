import { useState } from 'react'
import { RevisionDiff } from '../research/ResearchEditorial'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Icon from '../ui/Icon'
import TextField from '../ui/TextField'
import { useForm } from '../../hooks/useForm'
import { createValidator, rules } from '../../lib/validators'
import { submissionEditService } from '../../services/submissionEditService'
import '../../assets/styles/revision.css' // Form sửa + khung "Xem thay đổi" (dùng chung với bài nghiên cứu)

/*
 * KHỐI "SỬA BÀI" TRÊN TRANG CHI TIẾT HỒ SƠ CỦA BTV (EditorSubmissionDetail) — sửa ngay tại chỗ, không có màn hình riêng.
 * Luồng: nút "Sửa bài" -> form tiêu đề / tóm tắt / nội dung + khung "Xem thay đổi" (highlight như bài nghiên cứu)
 *   -> "Lưu nội dung" -> hỏi xác nhận -> submissionEditService.editContent -> PUT /api/editor/submissions/{mã}/content
 *   (SubmissionEditController -> SubmissionEditService). Lưu thẳng vào hồ sơ, KHÔNG cần người gửi xác nhận.
 * Chỉ hiện khi hồ sơ đang thẩm định (IN_REVIEW), ví dụ sau khi Ban biên tập yêu cầu chỉnh sửa trả hồ sơ về.
 *
 * Props: detail = chi tiết hồ sơ (SubmissionDetail); onSaved(response) = trang cha cập nhật dữ liệu + thông báo.
 */

const DIFF_FIELDS = [
  { key: 'title', label: 'Tiêu đề' },
  { key: 'summary', label: 'Tóm tắt' },
  { key: 'content', label: 'Nội dung' },
]

/** Cùng giới hạn với lúc người dân gửi hồ sơ; backend kiểm tra lại. */
const validate = createValidator({
  title: [rules.required('Vui lòng nhập tiêu đề.'), rules.minLength(10, 'Tiêu đề tối thiểu 10 ký tự.'), rules.maxLength(200, 'Tiêu đề tối đa 200 ký tự.')],
  summary: [rules.required('Vui lòng nhập tóm tắt sự việc.'), rules.maxLength(300, 'Tóm tắt tối đa 300 ký tự.')],
  content: [rules.required('Vui lòng nhập nội dung.'), rules.minLength(50, 'Nội dung tối thiểu 50 ký tự.'), rules.maxLength(5000, 'Nội dung tối đa 5000 ký tự.')],
})

function SubmissionEditPanel({ detail, onSaved }) {
  const original = { title: detail.title ?? '', summary: detail.summary ?? '', content: detail.content ?? '' }
  const form = useForm(original, validate)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (detail.status !== 'IN_REVIEW') return null

  const cancel = () => {
    form.reset()
    setEditing(false)
  }

  // handleSubmit tự đưa lỗi backend lên đúng ô; hộp xác nhận đóng lại để thấy lỗi
  const save = form.handleSubmit(async (values) => {
    const response = await submissionEditService.editContent(detail.trackingCode, values)
    form.reset({ title: response.data.title ?? '', summary: response.data.summary ?? '', content: response.data.content ?? '' })
    setEditing(false)
    onSaved(response)
  })

  return (
    <section className="admin-panel revision-form">
      <div className="revision-form__head">
        <h2>Biên tập nội dung</h2>
        <small>Sửa trực tiếp tiêu đề, tóm tắt, nội dung hồ sơ. Lưu là áp dụng ngay, không cần người gửi xác nhận.</small>
      </div>

      {!editing ? (
        <div>
          <Button variant="secondary" className="btn--sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={14} />
            Sửa bài
          </Button>
        </div>
      ) : (
        <>
          <Alert type="error">{form.formError}</Alert>
          <TextField label="Tiêu đề" required counter={200} {...form.field('title')} />
          <TextField label="Tóm tắt" required multiline rows={3} counter={300} {...form.field('summary')} />
          <TextField label="Nội dung" required multiline rows={12} counter={5000} {...form.field('content')} />

          <div className="revision-form__head">
            <h2>Xem thay đổi</h2>
          </div>
          <RevisionDiff original={original} proposed={form.values} fields={DIFF_FIELDS} />

          <div className="desk-actions__buttons">
            <Button variant="secondary" className="btn--sm" onClick={cancel} disabled={form.submitting}>
              <Icon name="x" size={14} />
              Huỷ sửa
            </Button>
            <Button
              className="btn--sm"
              disabled={!form.isDirty}
              title={form.isDirty ? '' : 'Bạn chưa thay đổi gì'}
              onClick={() => setConfirming(true)}
            >
              <Icon name="check" size={14} />
              Lưu nội dung
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Lưu nội dung đã biên tập?"
        message="Nội dung hồ sơ được thay ngay bằng bản bạn vừa sửa (bản gốc vẫn được lưu lại trong lịch sử toà soạn)."
        confirmLabel="Lưu nội dung"
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
    </section>
  )
}

export default SubmissionEditPanel
