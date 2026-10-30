import { useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'
import { CANCEL_NOTE_MAX, cancelReasonsFor } from '../../lib/cancellation'
import { submissionService } from '../../services/submissionService'

/*
 * HỘP THOẠI HUỶ HỒ SƠ — mở từ nút "Huỷ hồ sơ" ở components/submission/CancelSubmissionPanel.jsx.
 * Luồng: CancelSubmissionDialog -> submissionService.cancel -> SubmissionController -> SubmissionCancelService.
 *
 * Người gửi chọn lý do (bắt buộc) + ghi chú gửi toà soạn (không bắt buộc, bắt buộc khi chọn "Lý do khác").
 * Thành công: gọi onCancelled(chi tiết hồ sơ mới) để trang cha hiện ngay trạng thái "Đã huỷ".
 * Lỗi 409 (toà soạn vừa tiếp nhận hồ sơ trong lúc hộp thoại đang mở): ẩn form, chỉ còn nút "Đóng và tải lại".
 *
 * Không dùng ConfirmDialog có sẵn vì cần thêm ô nhập, và nút "Huỷ" mặc định của nó dễ nhầm với "Huỷ hồ sơ".
 */
function CancelSubmissionDialog({ detail, role, onClose, onCancelled, onConflict }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState('')
  const [running, setRunning] = useState(false)

  /** Kiểm tra giống backend để báo lỗi ngay, khỏi phải gọi API. */
  const validate = () => {
    const next = {}
    if (!reason) next.reason = 'Vui lòng chọn lý do huỷ.'
    if (reason === 'OTHER' && !note.trim()) next.note = 'Vui lòng ghi rõ lý do huỷ.'
    if (note.trim().length > CANCEL_NOTE_MAX) next.note = `Ghi chú tối đa ${CANCEL_NOTE_MAX} ký tự.`
    return next
  }

  const cancel = async () => {
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length) return
    setRunning(true)
    setError('')
    try {
      const response = await submissionService.cancel(detail.trackingCode, { reason, note: note.trim() })
      onCancelled(response.data)
    } catch (err) {
      if (err.status === 409) setConflict(err.message)
      else if (err.errors) setErrors(err.errors) // Lỗi theo từng ô (reason / note) hiện ngay dưới ô
      else setError(err.message)
      setRunning(false)
    }
  }

  // Đổi ô nào thì xoá lỗi của ô đó
  const changeReason = (event) => {
    setReason(event.target.value)
    setErrors((prev) => ({ ...prev, reason: '', note: '' }))
  }
  const changeNote = (event) => {
    setNote(event.target.value)
    setErrors((prev) => ({ ...prev, note: '' }))
  }

  return (
    <Modal open title={`Huỷ hồ sơ ${detail.trackingCode}?`} onClose={running ? () => { } : onClose}>
      <div className="cancel-dialog">
        <p className="modal__text">
          Hồ sơ <strong>“{detail.title}”</strong> sẽ dừng xử lý và chuyển sang trạng thái <strong>Đã huỷ</strong>.
        </p>
        <p className="cancel-dialog__warn">
          <Icon name="alertCircle" size={16} />
          Không thể khôi phục hồ sơ sau khi huỷ. Muốn phản ánh lại, bạn cần gửi hồ sơ mới.
        </p>

        {conflict ? (
          <>
            <Alert type="error" title="Không huỷ được hồ sơ">
              {conflict}
            </Alert>
            <div className="modal__actions">
              <Button onClick={onConflict}>
                <Icon name="refresh" size={16} />
                Đóng và tải lại
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="cancel-dialog__form">
              <SelectField
                label="Lý do huỷ"
                required
                placeholder="-- Chọn lý do --"
                options={cancelReasonsFor(role)}
                value={reason}
                error={errors.reason}
                onChange={changeReason}
              />
              <TextField
                label="Ghi chú cho toà soạn"
                required={reason === 'OTHER'}
                multiline
                rows={3}
                counter={CANCEL_NOTE_MAX}
                placeholder={reason === 'OTHER' ? 'Ghi rõ lý do bạn huỷ hồ sơ' : 'Không bắt buộc'}
                value={note}
                error={errors.note}
                onChange={changeNote}
              />
            </div>
            <Alert type="error">{error}</Alert>
            <div className="modal__actions">
              <Button variant="secondary" onClick={onClose} disabled={running}>
                Giữ lại hồ sơ
              </Button>
              <Button variant="danger" loading={running} onClick={cancel}>
                {!running && <Icon name="trash" size={16} />}
                Huỷ hồ sơ
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default CancelSubmissionDialog
