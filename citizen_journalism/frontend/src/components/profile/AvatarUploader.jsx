import { useEffect, useRef, useState } from 'react'
import { userService } from '../../services/userService'
import Alert from '../ui/Alert'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

// Khớp với backend (FileStorageService.IMAGE_TYPES và UserService.MAX_AVATAR_BYTES).
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 2

/**
 * Khu vực ẢNH ĐẠI DIỆN ở trang Hồ sơ: xem ảnh hiện tại, chọn ảnh mới, XEM TRƯỚC, rồi mới Lưu hoặc Huỷ.
 *
 * LUỒNG:
 *   1. Bấm vào ảnh / nút camera -> mở hộp chọn file của máy (thẻ <input type="file"> đang được ẩn).
 *   2. Chọn ảnh -> kiểm tra định dạng + dung lượng ngay trên trình duyệt -> hiện ảnh XEM TRƯỚC
 *      (URL.createObjectURL tạo đường dẫn tạm "blob:..." trỏ tới file trong máy, chưa gửi lên server).
 *   3. "Lưu ảnh" -> userService.uploadAvatar() -> backend lưu vào uploads/avatars -> onUpdated(hồ sơ mới).
 *      "Huỷ" -> bỏ ảnh xem trước, giữ ảnh cũ.
 *   4. "Xoá ảnh" -> quay về hiển thị chữ cái đầu tên.
 *
 * Props: profile (hồ sơ hiện tại), onUpdated(profile, message) (báo cho trang cha khi đã đổi xong).
 */
function AvatarUploader({ profile, onUpdated }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null) // File đã chọn nhưng CHƯA lưu
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Dọn dẹp: mỗi đường dẫn "blob:" chiếm bộ nhớ trình duyệt, phải thu hồi khi không dùng nữa.
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  const chooseFile = () => inputRef.current?.click()

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    event.target.value = '' // Cho phép chọn lại đúng file đó lần sau (nếu không, onChange sẽ không chạy)
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.')
      return
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ảnh tối đa ${MAX_SIZE_MB}MB. Ảnh bạn chọn nặng ${(selected.size / 1024 / 1024).toFixed(1)}MB.`)
      return
    }
    setError('')
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const cancelPreview = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  /** Gọi API rồi báo kết quả cho trang cha; dùng chung cho Lưu ảnh và Xoá ảnh. */
  const run = async (request, successMessage) => {
    setSaving(true)
    setError('')
    try {
      const response = await request()
      cancelPreview()
      onUpdated(response.data, successMessage)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveAvatar = () => run(() => userService.uploadAvatar(file), 'Đã cập nhật ảnh đại diện.')
  const removeAvatar = () => {
    if (window.confirm('Xoá ảnh đại diện hiện tại?')) {
      run(() => userService.removeAvatar(), 'Đã xoá ảnh đại diện.')
    }
  }

  return (
    <div className="avatar-uploader">
      <button
        type="button"
        className={`avatar-uploader__frame ${previewUrl ? 'is-preview' : ''}`}
        onClick={chooseFile}
        disabled={saving}
        aria-label="Chọn ảnh đại diện mới"
      >
        <Avatar name={profile.fullName} src={previewUrl ?? profile.avatarUrl} size={120} />
        <span className="avatar-uploader__camera" aria-hidden="true">
          <Icon name="camera" size={16} />
        </span>
      </button>

      {/* Thẻ chọn file thật, bị ẩn; được "bấm hộ" bằng chooseFile(). accept: chỉ gợi ý file ảnh trong hộp chọn. */}
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} hidden onChange={handleFileChange} />

      {previewUrl ? (
        <div className="avatar-uploader__preview">
          <span className="avatar-uploader__badge">Xem trước · chưa lưu</span>
          <div className="avatar-uploader__actions">
            <Button loading={saving} onClick={saveAvatar}>
              Lưu ảnh
            </Button>
            <Button variant="secondary" onClick={cancelPreview} disabled={saving}>
              Huỷ
            </Button>
          </div>
        </div>
      ) : (
        <div className="avatar-uploader__actions avatar-uploader__actions--subtle">
          <button type="button" className="link-button" onClick={chooseFile} disabled={saving}>
            {profile.avatarUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
          </button>
          {profile.avatarUrl && (
            <button type="button" className="link-button link-button--muted" onClick={removeAvatar} disabled={saving}>
              Xoá ảnh
            </button>
          )}
        </div>
      )}

      <p className="avatar-uploader__hint">JPG, PNG, WEBP hoặc GIF · tối đa {MAX_SIZE_MB}MB</p>
      <Alert type="error">{error}</Alert>
    </div>
  )
}

export default AvatarUploader
