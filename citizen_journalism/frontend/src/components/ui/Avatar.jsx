/** Chữ cái đại diện: chữ đầu của TÊN (từ cuối cùng, theo cách gọi tên người Việt), ví dụ "Trịnh Tuấn Anh" -> "A". */
const initialOf = (fullName = '') => fullName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || '?'

/**
 * Ảnh đại diện tròn: có ảnh thì hiện ảnh, chưa có thì hiện chữ cái đầu của tên trên nền gradient cam.
 * Dùng ở: menu tài khoản (UserMenu), trang Hồ sơ (AvatarUploader)... CSS: .avatar trong src/index.css.
 *
 * Props:
 *   - name : họ tên (để lấy chữ cái và làm mô tả ảnh)
 *   - src  : đường dẫn ảnh, ví dụ "/uploads/avatars/CT0001-xxx.png" hoặc ảnh xem trước (blob:...). Không có -> chữ cái.
 *   - size : đường kính (px)
 */
function Avatar({ name, src, size = 40, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }
  return src ? (
    <img src={src} alt={`Ảnh đại diện của ${name}`} className={`avatar ${className}`} style={style} />
  ) : (
    <span className={`avatar avatar--initial ${className}`} style={style} aria-hidden="true">
      {initialOf(name)}
    </span>
  )
}

export default Avatar
