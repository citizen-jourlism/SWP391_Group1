import { useEffect, useRef, useState } from 'react'
import Icon from '../ui/Icon'
import { formatFileSize } from '../../lib/format'
import { FILE_TYPE_INFO, MB, fileTypeOf } from '../../lib/submission'
import '../../assets/styles/submit.css'

/** Tên ngắn của từng định dạng để hiện gợi ý "JPG, PNG, PDF..." (2 kiểu khai báo MP3 gộp làm 1). */
const FORMAT_LABELS = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'video/mp4': 'MP4',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'application/pdf': 'PDF',
}

/**
 * KHU TẢI TỆP dùng chung: tư liệu của form gửi tin và giấy tờ của đơn đăng ký Cộng tác viên.
 * Dùng ở: components/submission/ReportForm.jsx, components/contributor/ContributorApplyForm.jsx.
 * CSS: assets/styles/submit.css (mục "Tải tư liệu").
 *
 * CHỨC NĂNG:
 *   - Bấm để chọn tệp HOẶC kéo-thả tệp vào khung; chọn nhiều tệp một lúc.
 *   - Kiểm tra ngay trên trình duyệt: đúng định dạng, không quá dung lượng, không quá số tệp
 *     (giới hạn lấy từ backend qua `options`, xem SubmissionFormOptions.java). Tệp sai bị bỏ qua kèm thông báo.
 *   - Danh sách tệp đã chọn: ảnh có hình xem trước, loại khác hiện icon; nút xoá từng tệp.
 *
 * Props:
 *   - files    : mảng { id, file, previewUrl } (state nằm ở trang cha, trong useForm)
 *   - onChange : hàm nhận mảng mới
 *   - options  : { maxFiles, maxFileSizeMb, maxTotalSizeMb, acceptedTypes }
 *   - error    : lỗi hiển thị dưới khung (ví dụ "Vui lòng đính kèm ít nhất 1 tệp")
 *
 * ẢNH XEM TRƯỚC: URL.createObjectURL(file) tạo một đường dẫn tạm "blob:..." trỏ tới file trong máy để thẻ <img> hiển thị
 * (không cần tải lên trước). Đường dẫn này chiếm bộ nhớ nên phải "thu hồi" (revokeObjectURL) khi xoá tệp hoặc rời trang.
 */
function EvidenceUploader({ files, onChange, options, error }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('') // Thông báo các tệp bị bỏ qua

  // Rời trang (component biến mất) -> thu hồi mọi ảnh xem trước còn lại.
  // filesRef luôn giữ danh sách mới nhất để hàm dọn dẹp (chỉ tạo 1 lần) đọc được.
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => () => filesRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl)), [])

  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0)

  /** Thêm các tệp vừa chọn/thả vào danh sách sau khi lọc tệp không hợp lệ. */
  const addFiles = (fileList) => {
    const skipped = []
    const accepted = []
    for (const file of fileList) {
      const duplicate = files.some(
        (item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified,
      )
      if (duplicate) continue // Chọn lại đúng tệp đã có -> lặng lẽ bỏ qua
      if (!options.acceptedTypes.includes(file.type)) {
        skipped.push(`"${file.name}" không đúng định dạng`)
      } else if (file.size > options.maxFileSizeMb * MB) {
        skipped.push(`"${file.name}" lớn hơn ${options.maxFileSizeMb}MB`)
      } else {
        accepted.push(file)
      }
    }

    const room = options.maxFiles - files.length
    if (accepted.length > room) skipped.push(`chỉ được đính kèm tối đa ${options.maxFiles} tệp`)
    const added = accepted.slice(0, Math.max(room, 0)).map((file) => ({
      id: crypto.randomUUID(), // Khoá duy nhất cho React khi vẽ danh sách
      file,
      previewUrl: fileTypeOf(file.type) === 'IMAGE' ? URL.createObjectURL(file) : null,
    }))

    setNotice(skipped.length ? `Đã bỏ qua: ${skipped.join('; ')}.` : '')
    if (added.length) onChange([...files, ...added])
  }

  const removeFile = (id) => {
    const target = files.find((item) => item.id === id)
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
    onChange(files.filter((item) => item.id !== id))
  }

  // ----- Kéo-thả: preventDefault để trình duyệt KHÔNG mở tệp ra tab mới khi thả vào -----
  const dragHandlers = {
    onDragOver: (event) => {
      event.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event) => {
      event.preventDefault()
      setDragging(false)
      addFiles(event.dataTransfer.files)
    },
  }

  const full = files.length >= options.maxFiles
  // Ví dụ ['application/pdf', 'image/jpeg'] -> "PDF, JPG"; Set để bỏ trùng (2 kiểu MP3)
  const formats = [...new Set(options.acceptedTypes.map((type) => FORMAT_LABELS[type] ?? type))].join(', ')

  return (
    <div className={`uploader ${error ? 'uploader--error' : ''}`}>
      <button
        type="button"
        className={`uploader__drop ${dragging ? 'is-dragging' : ''}`}
        onClick={() => inputRef.current.click()} // Mở hộp thoại chọn tệp của hệ điều hành
        disabled={full}
        {...dragHandlers}
      >
        <span className="uploader__drop-icon">
          <Icon name="upload" size={24} />
        </span>
        <strong>{full ? 'Đã đủ số tệp tối đa' : 'Kéo thả tệp vào đây hoặc bấm để chọn'}</strong>
        <small>
          {formats} · tối đa {options.maxFileSizeMb}MB/tệp · {options.maxFiles} tệp
        </small>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={options.acceptedTypes.join(',')} // Hộp thoại chọn tệp chỉ hiện các loại hợp lệ
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = '' // Xoá lựa chọn để lần sau chọn lại đúng tệp đó vẫn nhận
        }}
      />

      {notice && (
        <p className="uploader__notice">
          <Icon name="info" size={14} />
          {notice}
        </p>
      )}

      {files.length > 0 && (
        <>
          <ul className="uploader__list">
            {files.map(({ id, file, previewUrl }) => {
              const typeInfo = FILE_TYPE_INFO[fileTypeOf(file.type)]
              return (
                <li key={id} className="uploader__item">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="uploader__thumb" />
                  ) : (
                    <span className="uploader__thumb uploader__thumb--icon">
                      <Icon name={typeInfo.icon} size={20} />
                    </span>
                  )}
                  <span className="uploader__meta">
                    <strong title={file.name}>{file.name}</strong>
                    <small>
                      {typeInfo.label} · {formatFileSize(file.size)}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="uploader__remove"
                    onClick={() => removeFile(id)}
                    aria-label={`Xoá tệp ${file.name}`}
                    title="Xoá tệp"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="uploader__summary">
            Đã chọn <b>{files.length}</b>/{options.maxFiles} tệp · {formatFileSize(totalBytes)} / {options.maxTotalSizeMb} MB
          </p>
        </>
      )}

      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export default EvidenceUploader
