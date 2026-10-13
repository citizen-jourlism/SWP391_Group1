import ConsoleLayout from '../layout/ConsoleLayout'
import { formatToday } from '../../lib/format'
import '../../assets/styles/editor.css'

/**
 * Các mục của BÀN LÀM VIỆC BIÊN TẬP VIÊN, chia nhóm theo đúng các bước nghiệp vụ trong SRS (UC Editor 01–13).
 * soon: true = chức năng chưa làm (trang chỉ giới thiệu thiết kế, xem routes/editor/EditorPlanned.jsx).
 * Thêm trang mới: thêm 1 dòng ở đây + 1 <Route> con trong App.jsx.
 */
const NAV_GROUPS = [
  {
    label: 'Bàn làm việc',
    items: [{ to: '/editor', end: true, icon: 'activity', label: 'Tổng quan', title: 'Bàn làm việc hôm nay' }],
  },
  {
    label: 'Tiếp nhận',
    items: [
      { to: '/editor/queue', icon: 'fileText', label: 'Hàng đợi tin bài', title: 'Hàng đợi tin bài' },
      { to: '/editor/screening', icon: 'search', label: 'Sàng lọc AI', title: 'Sàng lọc AI & gộp tin trùng', soon: true },
    ],
  },
  {
    label: 'Xác minh & biên tập',
    items: [
      { to: '/editor/assignments', icon: 'mapPin', label: 'Giao nhiệm vụ', title: 'Nhiệm vụ xác minh hiện trường', soon: true },
      { to: '/editor/articles', icon: 'edit', label: 'Biên tập bài viết', title: 'Biên tập bài viết', soon: true },
    ],
  },
  {
    label: 'Cộng đồng',
    items: [
      { to: '/editor/applications', icon: 'award', label: 'Đơn đăng ký CTV', title: 'Đơn đăng ký Cộng tác viên' },
      { to: '/editor/members', icon: 'shield', label: 'Uy tín & vi phạm', title: 'Uy tín & vi phạm', soon: true },
    ],
  },
]

/**
 * KHUNG BÀN LÀM VIỆC BIÊN TẬP VIÊN (/editor/...): dùng khung chung ConsoleLayout với giao diện SÁNG
 * kiểu "toà soạn" (theme "editor", CSS: assets/styles/editor.css), khác cả trang người dân lẫn khu admin.
 * Trên thanh tiêu đề có thêm ngày hôm nay + trạng thái "Đang trực".
 * Bảo vệ quyền: App.jsx bọc khung này trong <ProtectedRoute roles={['EDITOR']}>.
 */
function EditorLayout() {
  return (
    <ConsoleLayout
      theme="editor"
      homePath="/editor"
      badge="Newsroom Desk"
      crumbRoot="Bàn biên tập"
      roleLabel="Biên tập viên"
      navGroups={NAV_GROUPS}
      topbarExtra={
        <div className="desk-status">
          <span className="desk-status__date">{formatToday()}</span>
          <span className="desk-status__live">
            <span className="desk-status__dot" aria-hidden="true" />
            Đang trực
          </span>
        </div>
      }
    />
  )
}

export default EditorLayout
