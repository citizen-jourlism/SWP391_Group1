import { useEffect, useRef, useState } from 'react'
import Icon from '../ui/Icon'
import { formatFileSize } from '../../lib/format'
import { MB } from '../../lib/submission'

/**
 * KHU "HÌNH ẢNH MINH HOẠ & DẪN CHỨNG" trong trình soạn bài nghiên cứu: lưới ảnh, mỗi ảnh có ô chú thích
 * ("Hình 1: ..."), nút xoá, nút đổi thứ tự (lên / xuống) và ô thêm ảnh ở cuối.
 * Dùng ở: routes/ResearchEditor.jsx. CSS: assets/styles/research.css (mục "Hình ảnh").
 *
 * DỮ LIỆU (state nằm ở trang cha): mảng figures, mỗi phần tử
 *   { key, url?, file?, previewUrl, name, size, caption }
 *   - Ảnh đã lưu trên máy chủ: có url (previewUrl = url).
 *   - Ảnh mới chọn: có file, previewUrl = đường dẫn tạm "blob:..." (URL.createObjectURL) để xem trước.
 *
 * Props: figures, onChange(mảngMới), options ({ maxImages, maxImageSizeMb, acceptedImageTypes }), error
 */
function FigureEditor({ figures, onChange, options, error }) {
  const inputRef = useRef(null)
  const [notice, setNotice] = useState('')

  // Rời trang -> thu hồi các đường dẫn tạm "blob:" của ảnh mới (giải phóng bộ nhớ)
  const figuresRef = useRef(figures)
  useEffect(() => {
    figuresRef.current = figures
  }, [figures])
  useEffect(() => () => figuresRef.current.forEach((item) => item.file && URL.revokeObjectURL(item.previewUrl)), [])

  const addFiles = (fileList) => {
    const skipped = []
    const added = []
    for (const file of fileList) {
      if (!options.acceptedImageTypes.includes(file.type)) skipped.push(`"${file.name}" không phải ảnh JPG/PNG/WEBP/GIF`)
      else if (file.size > options.maxImageSizeMb * MB) skipped.push(`"${file.name}" lớn hơn ${options.maxImageSizeMb}MB`)
      else added.push(file)
    }
    const room = options.maxImages - figures.length
    if (added.length > room) skipped.push(`mỗi bài tối đa ${options.maxImages} ảnh`)
    const newItems = added.slice(0, Math.max(room, 0)).map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      caption: '',
    }))
    setNotice(skipped.length ? `Đã bỏ qua: ${skipped.join('; ')}.` : '')
    if (newItems.length) onChange([...figures, ...newItems])
  }

  const update = (key, changes) => onChange(figures.map((item) => (item.key === key ? { ...item, ...changes } : item)))

  const remove = (key) => {
    const target = figures.find((item) => item.key === key)
    if (target?.file) URL.revokeObjectURL(target.previewUrl)
    onChange(figures.filter((item) => item.key !== key))
  }

  /** Đổi chỗ ảnh thứ index với ảnh bên cạnh (step = -1: lên trước, +1: ra sau). */
  const move = (index, step) => {
    const next = [...figures]
    ;[next[index], next[index + step]] = [next[index + step], next[index]] // Hoán đổi 2 phần tử
    onChange(next)
  }

  return (
    <div className="figures">
      <div className="figures__grid">
        {figures.map((item, index) => (
          <figure key={item.key} className="figure-card">
            <div className="figure-card__image">
              <img src={item.previewUrl} alt={item.caption || `Hình ${index + 1}`} />
              <span className="figure-card__number">Hình {index + 1}</span>
              <div className="figure-card__tools">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Đưa ảnh lên trước" title="Lên trước">
                  <Icon name="arrowLeft" size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === figures.length - 1}
                  aria-label="Đưa ảnh ra sau"
                  title="Ra sau"
                  className="figure-card__next"
                >
                  <Icon name="arrowLeft" size={14} />
                </button>
                <button type="button" onClick={() => remove(item.key)} aria-label={`Xoá hình ${index + 1}`} title="Xoá ảnh" className="is-danger">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
            <figcaption>
              <input
                type="text"
                value={item.caption}
                maxLength={300}
                onChange={(event) => update(item.key, { caption: event.target.value })}
                placeholder="Chú thích: nội dung ảnh, nguồn ảnh..."
                aria-label={`Chú thích hình ${index + 1}`}
              />
              <small>
                {item.name} · {formatFileSize(item.size)}
                {item.file && ' · chưa lưu'}
              </small>
            </figcaption>
          </figure>
        ))}

        {figures.length < options.maxImages && (
          <button type="button" className="figures__add" onClick={() => inputRef.current.click()}>
            <Icon name="image" size={26} />
            <strong>Thêm hình ảnh</strong>
            <small>
              JPG, PNG, WEBP · tối đa {options.maxImageSizeMb}MB · còn {options.maxImages - figures.length} ảnh
            </small>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={options.acceptedImageTypes.join(',')}
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = '' // Cho phép chọn lại đúng tệp đó lần sau
        }}
      />

      {notice && <p className="figures__notice">{notice}</p>}
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export default FigureEditor
