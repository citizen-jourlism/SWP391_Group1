/**
 * Thông tin về VAI TRÒ (role) và TRẠNG THÁI tài khoản, khớp với enum User.Role / User.Status ở backend.
 * Dùng ở: menu tài khoản, trang Đăng nhập (chọn trang chuyển tới), khu quản trị (bảng tài khoản, biểu đồ...).
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

/** Mô tả ngắn từng vai trò (hiện trong hộp thoại đổi vai trò / tạo tài khoản của admin). */
export const ROLE_DESCRIPTIONS = {
  CITIZEN: 'Gửi tin nóng, phản ánh và theo dõi tiến độ xử lý.',
  CONTRIBUTOR: 'Nhận nhiệm vụ xác minh hiện trường, viết bài và gửi bằng chứng.',
  EXPERT: 'Gửi bài nghiên cứu, phân tích chuyên môn.',
  EDITOR: 'Sàng lọc, biên tập tin bài và điều phối cộng tác viên.',
  DEPUTY_EIC: 'Duyệt tin bài theo chuyên mục, chuyển tin quan trọng lên Tổng biên tập.',
  EIC: 'Duyệt cuối các tin quan trọng / khẩn cấp, xử lý đính chính.',
  SYSTEM_ADMIN: 'Quản lý tài khoản và cấu hình hệ thống.',
}

/** Màu nhãn cho từng vai trò (class .badge--<tone> trong ui.css). */
export const ROLE_TONES = {
  CITIZEN: 'neutral',
  CONTRIBUTOR: 'green',
  EXPERT: 'purple',
  EDITOR: 'blue',
  DEPUTY_EIC: 'orange',
  EIC: 'red',
  SYSTEM_ADMIN: 'dark',
}

/**
 * Các vai trò admin ĐƯỢC PHÉP gán cho người khác. Không có SYSTEM_ADMIN vì hệ thống chỉ có 1 admin
 * (backend AdminService cũng chặn điều này).
 */
export const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter((role) => role !== 'SYSTEM_ADMIN')

/**
 * Các vai trò được GỬI TIN / KHIẾU NẠI (trang /submit). Khớp luật "/api/submissions/**" trong backend SecurityConfig.
 * Nhân sự toà soạn (Biên tập viên, Phó TBT, TBT) và admin là người XỬ LÝ nên không gửi.
 */
export const SUBMITTER_ROLES = ['CITIZEN', 'CONTRIBUTOR', 'EXPERT']

/** Trạng thái tài khoản: tên hiển thị + màu nhãn. */
export const STATUS_INFO = {
  ACTIVE: { label: 'Hoạt động', tone: 'green' },
  PENDING_OTP: { label: 'Chờ xác thực', tone: 'orange' },
  LOCKED: { label: 'Đã khoá', tone: 'red' },
}

/**
 * Trang mặc định chuyển tới sau khi đăng nhập, theo vai trò. Vai trò không có trong bảng -> trang chủ.
 * Khi làm thêm trang riêng cho vai trò khác (ví dụ bàn làm việc của Phó TBT) thì thêm vào đây.
 */
const HOME_PATHS = {
  SYSTEM_ADMIN: '/admin',
  EDITOR: '/editor', // Bàn làm việc Biên tập viên
  DEPUTY_EIC: '/leadership',
  EIC: '/',
}

export const homePathFor = (role) => HOME_PATHS[role] ?? '/'
