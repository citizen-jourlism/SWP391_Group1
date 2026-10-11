/**
 * Thông tin về các VAI TRÒ (role) trong hệ thống, khớp với enum User.Role ở backend.
 * Dùng ở: menu người dùng (hiện tên vai trò), trang Đăng nhập (chọn trang chuyển tới sau khi đăng nhập),
 * sau này là trang admin.
 */

/** Tên tiếng Việt của từng vai trò để hiển thị. */
export const ROLE_LABELS = {
  CITIZEN: 'Người dân',
  CONTRIBUTOR: 'Cộng tác viên',
  EXPERT: 'Chuyên gia',
  EDITOR: 'Biên tập viên',
  DEPUTY_EIC: 'Phó Tổng biên tập',
  EIC: 'Tổng biên tập',
  SYSTEM_ADMIN: 'Quản trị hệ thống',
}

/**
 * Trang mặc định chuyển tới sau khi đăng nhập, theo vai trò.
 * Hiện mọi vai trò đều về trang chủ; khi làm xong trang riêng (ví dụ /admin cho SYSTEM_ADMIN)
 * chỉ cần thêm vào bảng này.
 */
const HOME_PATHS = {}

export const homePathFor = (role) => HOME_PATHS[role] ?? '/'
