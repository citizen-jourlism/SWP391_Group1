import { useEffect } from 'react'
import Icon from './Icon'

/**
 * Hộp thoại (popup) nổi giữa màn hình, nền phía sau tối lại. CSS: .modal* trong assets/styles/ui.css.
 * Đang dùng ở: hộp thoại đổi email (ChangeEmailDialog). Sau này: xác nhận xoá, form admin...
 *
 * Props: open (hiện/ẩn), title, onClose (đóng), children (nội dung).
 * TRẢI NGHIỆM: nhấn Esc hoặc bấm ra vùng tối bên ngoài để đóng; khi mở thì khoá cuộn trang phía sau.
 */
function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden' // Khoá cuộn trang phía sau
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    // onMouseDown trên lớp nền: chỉ đóng khi bấm đúng vùng tối (target === currentTarget), không đóng khi bấm trong hộp.
    <div className="modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal__dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Đóng">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
