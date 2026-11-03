import { useState } from 'react'
import { ReasonDialog } from '../research/ResearchEditorial'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import TextField from '../ui/TextField'
import { formatDateTime } from '../../lib/format'
import { BREAKING_SIGNS, NOTE_ACTION, NOTE_ROLE } from '../../lib/leadership'

/*
 * KHỐI DÙNG CHUNG của Bàn duyệt Ban biên tập (trang chi tiết hồ sơ + bài nghiên cứu), và khung "Ý kiến của
 * Ban biên tập" ở trang Biên tập viên.
 *   - DecisionBar     : 3–4 nút quyết định + các hộp thoại. Gọi onDecide({ decision, note, breakingSigns }).
 *   - LeadershipNotes : danh sách ý kiến / quyết định (ai, vai trò, hành động, ghi chú, lúc nào).
 * Quy tắc (backend LeadershipService kiểm tra lại):
 *   - Phó TBT tick dấu hiệu Breaking (hoặc tin đã là BREAKING) -> chỉ "Chuyển Tổng biên tập", không tự duyệt được.
 *   - Tổng biên tập không có bước chuyển tiếp, chỉ Duyệt / Yêu cầu chỉnh sửa / Từ chối.
 *   - Yêu cầu chỉnh sửa / Từ chối bắt buộc ghi chú (tối thiểu 10 ký tự).
 */

const EDITOR_EDITED = { label: 'Đã sửa bài', tone: 'blue' }

/**
 * @param isEic            người xem là Tổng biên tập
 * @param breaking         hồ sơ / bài đã được phân loại BREAKING từ trước
 * @param editorLabel      chữ mô tả người nhận khi yêu cầu chỉnh sửa, ví dụ "Biên tập viên Nguyễn Văn A"
 * @param editHint         câu giải thích BTV sẽ sửa thế nào (hồ sơ: sửa thẳng; bài nghiên cứu: tác giả phải xác nhận)
 * @param onDecide         async (body) => ...  lỗi backend tự hiện trong hộp thoại; thành công thì hộp tự đóng
 */
export function DecisionBar({ isEic, breaking, editorLabel, editHint, onDecide }) {
  const [dialog, setDialog] = useState(null) // 'approve' | 'edit' | 'reject' | null
  const close = () => setDialog(null)

  return (
    <>
      <div className="desk-actions__buttons">
        <Button className="btn--sm" onClick={() => setDialog('approve')}>
          <Icon name="checkCircle" size={14} />
          {!isEic && breaking ? 'Chuyển Tổng biên tập' : 'Duyệt'}
        </Button>
        <Button variant="secondary" className="btn--sm" onClick={() => setDialog('edit')}>
          <Icon name="edit" size={14} />
          Yêu cầu chỉnh sửa
        </Button>
        <Button variant="danger" className="btn--sm" onClick={() => setDialog('reject')}>
          <Icon name="x" size={14} />
          Từ chối
        </Button>
      </div>

      <ApproveDialog
        open={dialog === 'approve'}
        isEic={isEic}
        breaking={breaking}
        onClose={close}
        onSubmit={onDecide}
      />
      <ReasonDialog
        open={dialog === 'edit'}
        title="Yêu cầu chỉnh sửa"
        message={`Bài được trả về ${editorLabel || 'Biên tập viên'} để biên tập lại ngay trên trang chi tiết của BTV. ${editHint ?? ''} Ghi rõ cần sửa gì, sửa như thế nào (người gửi không thấy ghi chú này).`}
        label="Nội dung cần chỉnh sửa"
        confirmLabel="Gửi yêu cầu"
        confirmVariant="primary"
        onClose={close}
        onSubmit={(note) => onDecide({ decision: 'REQUEST_EDIT', note })}
      />
      <ReasonDialog
        open={dialog === 'reject'}
        title="Từ chối đăng tải"
        message="Bài dừng xử lý và không được xuất bản. Lý do lưu nội bộ để Biên tập viên nắm được."
        onClose={close}
        onSubmit={(note) => onDecide({ decision: 'REJECT', note })}
      />
    </>
  )
}

/**
 * Hộp DUYỆT. Phó TBT phải xét 3 dấu hiệu Breaking: tick bất kỳ ô nào -> nút thành "Chuyển Tổng biên tập".
 * Tin đã là BREAKING thì luôn chuyển Tổng biên tập (tick sẵn không cần, backend tự hiểu).
 */
function ApproveDialog({ open, isEic, breaking, onClose, onSubmit }) {
  const [signs, setSigns] = useState([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const escalate = !isEic && (breaking || signs.length > 0)

  const close = () => {
    setSigns([])
    setNote('')
    setError('')
    onClose()
  }

  const toggle = (value) =>
    setSigns((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))

  const submit = async (event) => {
    event.preventDefault()
    // Chuyển Tổng biên tập phải nêu rõ dấu hiệu Breaking (kể cả tin đã là BREAKING từ trước) để TBT biết lý do
    if (escalate && signs.length === 0) {
      setError('Chọn ít nhất 1 dấu hiệu Breaking của tin này để chuyển Tổng biên tập.')
      return
    }
    setRunning(true)
    setError('')
    try {
      await onSubmit({ decision: escalate ? 'ESCALATE' : 'APPROVE', note: note.trim() || null, breakingSigns: signs })
      close()
    } catch (err) {
      setError(err.errors?.breakingSigns || err.errors?.note || err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} title={isEic ? 'Duyệt & cho phép xuất bản' : 'Duyệt tin'} onClose={close}>
      <form onSubmit={submit} className="revision-form" noValidate>
        {isEic ? (
          <p className="modal__text">Bài sẽ chuyển sang "Chờ đăng tải" và được phép xuất bản.</p>
        ) : (
          <>
            <p className="modal__text">
              Xét các dấu hiệu Breaking dưới đây. <b>Tin Breaking chỉ Tổng biên tập được duyệt</b>: tick bất kỳ ô nào thì tin
              sẽ được chuyển Tổng biên tập thay vì xuất bản ngay.
            </p>
            {breaking && <Alert type="warning">Tin này đã được phân loại Breaking, phải chuyển Tổng biên tập.</Alert>}
            <fieldset className="breaking-signs">
              <legend>Dấu hiệu Breaking</legend>
              {BREAKING_SIGNS.map((sign) => (
                <div key={sign.value} className="breaking-signs__item">
                  <Checkbox label={sign.label} checked={signs.includes(sign.value)} onChange={() => toggle(sign.value)} />
                  <small>{sign.hint}</small>
                </div>
              ))}
            </fieldset>
          </>
        )}
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
            Đóng
          </Button>
          <Button type="submit" loading={running}>
            {escalate ? 'Chuyển Tổng biên tập' : 'Duyệt & cho phép xuất bản'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Danh sách ý kiến của toà soạn. notes: [{ reviewerName, role, action, comments, createdAt }].
 * Rỗng thì hiện emptyText (không truyền emptyText -> không hiện gì).
 */
export function LeadershipNotes({ title = 'Ý kiến của toà soạn', notes, emptyText }) {
  if (!notes?.length && !emptyText) return null
  return (
    <section className="admin-panel leadership-notes">
      <h2>{title}</h2>
      {!notes?.length && <p className="leadership-notes__empty">{emptyText}</p>}
      <ul>
        {notes?.map((note, index) => {
          const role = NOTE_ROLE[note.role]
          // BTV REQUEST_EDIT trên hồ sơ = BTV đã sửa trực tiếp nội dung (SubmissionEditService), không phải "yêu cầu"
          const action = note.role === 'EDITOR' && note.action === 'REQUEST_EDIT' ? EDITOR_EDITED : NOTE_ACTION[note.action]
          return (
            <li key={index}>
              <div className="leadership-notes__head">
                {/* Ý kiến gửi BTV không kèm vai trò (role = null, tên ghi chung "Ban biên tập") */}
                {note.role && <Badge tone={role?.tone}>{role?.label ?? note.role}</Badge>}
                <strong>{note.reviewerName}</strong>
                <Badge tone={action?.tone}>{action?.label ?? note.action}</Badge>
                <small>{formatDateTime(note.createdAt)}</small>
              </div>
              {/* Giữ nguyên xuống dòng như người viết đã nhập (white-space: pre-wrap trong CSS) */}
              {note.comments && <p>{note.comments}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
