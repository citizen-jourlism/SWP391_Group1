import Avatar from '../ui/Avatar'

/**
 * Ô "người dùng" gọn: ảnh đại diện + họ tên + dòng phụ (mặc định là email).
 * Dùng ở bảng tài khoản và danh sách "Mới đăng ký" của trang admin.
 */
function UserCell({ user, sub = user.email }) {
  return (
    <div className="user-cell">
      <Avatar name={user.fullName} src={user.avatarUrl} size={36} />
      <div className="user-cell__text">
        <strong>{user.fullName}</strong>
        <small>{sub}</small>
      </div>
    </div>
  )
}

export default UserCell
