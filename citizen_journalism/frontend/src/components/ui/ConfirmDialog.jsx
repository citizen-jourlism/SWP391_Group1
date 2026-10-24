import { useState } from 'react'
import Alert from './Alert'
import Button from './Button'
import Modal from './Modal'

/**
 * Hộp thoại XÁC NHẬN trước khi làm việc quan trọng (ví dụ khoá tài khoản). Đẹp và rõ hơn window.confirm().
 *
 * Props:
 *   - open, title, message
 *   - confirmLabel : chữ trên nút đồng ý (ví dụ "Khoá tài khoản")
 *   - danger       : true -> nút đồng ý màu đỏ
 *   - onConfirm    : async () => ...  việc cần làm; lỗi thì hiện ngay trong hộp thoại, thành công thì tự đóng
 *   - onClose
 */
function ConfirmDialog({ open, title, message, confirmLabel = 'Đồng ý', danger, onConfirm, onClose }) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setError('')
    onClose()
  }

  const confirm = async () => {
    setRunning(true)
    setError('')
    try {
      await onConfirm()
      close()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={close}>
      <p className="modal__text">{message}</p>
      <Alert type="error">{error}</Alert>
      <div className="modal__actions">
        <Button variant="secondary" onClick={close} disabled={running}>
          Huỷ
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={running} onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
