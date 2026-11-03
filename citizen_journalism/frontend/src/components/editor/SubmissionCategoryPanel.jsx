import { useState } from 'react'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import { useAsyncData } from '../../hooks/useAsyncData'
import { submissionCategoryService } from '../../services/submissionCategoryService'

/*
 * Ô PHÂN LOẠI TIN trên trang hồ sơ của Biên tập viên (routes/editor/EditorSubmissionDetail.jsx).
 * Luồng: ô này -> submissionCategoryService -> SubmissionCategoryController -> SubmissionCategoryService.
 *
 * Hiện chuyên mục hiện tại và Phó TBT phụ trách; nút "Phân loại tin" / "Đổi chuyên mục" mở hộp thoại chọn chuyên mục.
 * Phải phân loại vào chuyên mục CÓ Phó TBT thì mới "Duyệt & chuyển Phó TBT" / "Duyệt kết quả xác minh" được,
 * vì hồ sơ đi tới Phó TBT phụ trách chuyên mục đó. Hồ sơ đã chuyển khỏi bàn BTV thì chỉ xem, không đổi.
 *
 * Props: code = mã hồ sơ; status = trạng thái hồ sơ, đổi thì tải lại (ví dụ vừa tiếp nhận, vừa bị Phó TBT trả về).
 */
function SubmissionCategoryPanel({ code, status }) {
  const { data, error, setData } = useAsyncData(() => submissionCategoryService.get(code), `${code}|${status}`)
  const [open, setOpen] = useState(false)

  if (!data) return error ? <Alert type="error">{error}</Alert> : null

  return (
    <section className="admin-panel category-panel">
      <span className="category-panel__icon">
        <Icon name="flag" size={18} />
      </span>
      <div className="category-panel__main">
        <small>Chuyên mục</small>
        {data.categoryId ? (
          <strong>
            {data.categoryName}
            <span className="category-panel__deputy">
              {data.deputyName ? ` · Phó TBT ${data.deputyName}` : ' · Chưa có Phó TBT phụ trách'}
            </span>
          </strong>
        ) : (
          <strong className="category-panel__empty">Chưa phân loại</strong>
        )}
      </div>
      {data.categoryId && !data.deputyName && <Badge tone="orange">Chưa chuyển duyệt được</Badge>}
      {data.editable && (
        <Button variant={data.categoryId ? 'secondary' : 'primary'} className="btn--sm" onClick={() => setOpen(true)}>
          <Icon name={data.categoryId ? 'edit' : 'flag'} size={14} />
          {data.categoryId ? 'Đổi chuyên mục' : 'Phân loại tin'}
        </Button>
      )}
      {open && (
        <CategoryDialog
          code={code}
          data={data}
          onClose={() => setOpen(false)}
          onSaved={(next) => {
            setData(next)
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}

/** Hộp thoại chọn chuyên mục. Mỗi lựa chọn ghi rõ Phó TBT sẽ nhận hồ sơ, chuyên mục chưa có người phụ trách thì cảnh báo. */
function CategoryDialog({ code, data, onClose, onSaved }) {
  const [selected, setSelected] = useState(data.categoryId)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await submissionCategoryService.classify(code, selected)
      onSaved(response.data)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open title="Phân loại tin" onClose={saving ? () => { } : onClose}>
      <p className="category-dialog__hint">Hồ sơ sẽ được chuyển tới Phó Tổng biên tập phụ trách chuyên mục bạn chọn.</p>
      <Alert type="error">{error}</Alert>
      {data.options.length === 0 && (
        <Alert type="warning">Chưa có chuyên mục nào đang hoạt động. Hãy tạo chuyên mục ở mục Quản lý chuyên mục.</Alert>
      )}
      <div className="category-dialog__list" role="radiogroup" aria-label="Chuyên mục">
        {data.options.map((option) => (
          <label key={option.id} className={`category-option ${selected === option.id ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="category"
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
            />
            <span>
              <strong>{option.name}</strong>
              <small className={option.deputyName ? '' : 'category-option__warn'}>
                {option.deputyName ? `Phó TBT ${option.deputyName}` : 'Chưa có Phó TBT phụ trách'}
              </small>
            </span>
          </label>
        ))}
      </div>
      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Huỷ
        </Button>
        <Button onClick={save} loading={saving} disabled={!selected || selected === data.categoryId}>
          Lưu chuyên mục
        </Button>
      </div>
    </Modal>
  )
}

export default SubmissionCategoryPanel
