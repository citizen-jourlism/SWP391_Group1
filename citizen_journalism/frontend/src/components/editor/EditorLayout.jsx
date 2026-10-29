import { useLocation } from 'react-router-dom'
import ConsoleLayout from '../layout/ConsoleLayout'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatToday } from '../../lib/format'
import { editorService } from '../../services/editorService'
import '../../assets/styles/editor.css'

/**
 * Các mục của BÀN LÀM VIỆC BIÊN TẬP VIÊN, chia nhóm theo các bước xử lý của toà soạn.
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
      { to: '/editor/reputation', icon: 'shield', label: 'Uy tín và xử phạt', title: 'Uy tín và xử phạt' },
      { to: '/editor/assignments', icon: 'mapPin', label: 'Giao nhiệm vụ', title: 'Nhiệm vụ xác minh hiện trường', soon: true },
    ],
  },
  {
    label: 'Cộng đồng',
    items: [
      { to: '/editor/applications', icon: 'award', label: 'Đơn đăng ký CTV', title: 'Đơn đăng ký Cộng tác viên' },
      { to: '/editor/appeals', icon: 'shield', label: 'Khiếu nại mở khóa', title: 'Khiếu nại mở khóa' },
    ],
  },
]

/**
 * KHUNG BÀN LÀM VIỆC BIÊN TẬP VIÊN (/editor/...): dùng khung chung ConsoleLayout với giao diện SÁNG
 * kiểu "toà soạn" (theme "editor", CSS: assets/styles/editor.css), khác cả trang người dân lẫn khu admin.
 * Trên thanh tiêu đề có thêm ngày hôm nay. Menu trái có thêm:
 *   - thẻ "Ca trực hôm nay": số hồ sơ mới, đơn CTV, hồ sơ chờ bổ sung
 *   - số đếm cạnh mục "Hàng đợi tin bài" và "Đơn đăng ký CTV"
 * Số liệu lấy từ GET /api/editor/overview, TẢI LẠI mỗi khi chuyển trang (key = đường dẫn)
 * để sau khi xét xong 1 đơn, số đếm trên menu giảm ngay.
 * Bảo vệ quyền: App.jsx bọc khung này trong <ProtectedRoute roles={['EDITOR']}>.
 */
function EditorLayout() {
  const { pathname } = useLocation()
  const { data } = useAsyncData(() => editorService.getOverview(), pathname)
  const newSubmissions = data ? data.pendingHotNews + data.pendingComplaints : 0

  return (
    <ConsoleLayout
      theme="editor"
      homePath="/editor"
      badge="Newsroom Desk"
      crumbRoot="Bàn biên tập"
      roleLabel="Biên tập viên"
      navGroups={NAV_GROUPS}
      badges={{ '/editor/queue': newSubmissions, '/editor/applications': data?.pendingApplications }}
      topbarExtra={<span className="desk-status__date">{formatToday()}</span>}
      sidebarTop={
        <div className="duty-card">
          <div className="duty-card__head">
            <span className="desk-status__dot" aria-hidden="true" />
            Ca trực hôm nay
          </div>
          <div className="duty-card__stats">
            <div>
              <strong>{data ? newSubmissions : '–'}</strong>
              <span>Hồ sơ mới</span>
            </div>
            <div>
              <strong>{data ? data.pendingApplications : '–'}</strong>
              <span>Đơn CTV</span>
            </div>
            <div>
              <strong>{data ? data.needMoreInfo : '–'}</strong>
              <span>Chờ bổ sung</span>
            </div>
          </div>
        </div>
      }
    />
  )
}

export default EditorLayout
