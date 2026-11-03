import { Link } from 'react-router-dom'
import ConsoleLayout from '../layout/ConsoleLayout'
import UserMenu from '../layout/UserMenu'
import Icon from '../ui/Icon'
import { useAuth } from '../../hooks/useAuth'
import { formatToday } from '../../lib/format'
import { ROLE_LABELS } from '../../lib/roles'
import '../../assets/styles/editor.css'
import '../../assets/styles/leadership.css'

/**
 * Các mục của BÀN DUYỆT BAN BIÊN TẬP. Thêm trang mới: thêm 1 dòng ở đây + 1 <Route> con trong App.jsx.
 */
const NAV_GROUPS = [
  {
    label: 'Chờ tôi duyệt',
    items: [
      { to: '/leadership', end: true, icon: 'fileText', label: 'Hồ sơ phản ánh', title: 'Hồ sơ phản ánh chờ duyệt' },
      { to: '/leadership/appeals', icon: 'user', label: 'Khiếu nại xử phạt', title: 'Xét duyệt khiếu nại xử phạt', roles: ['DEPUTY_EIC'] },
      { to: '/leadership/violations', icon: 'shield', label: 'Báo cáo vi phạm', title: 'Phê duyệt xử lý vi phạm', roles: ['DEPUTY_EIC'] },
      { to: '/leadership/research', icon: 'edit', label: 'Bài nghiên cứu', title: 'Bài nghiên cứu chờ duyệt' },
      // TungTT - Iteration 3 Task 1: Duyệt đơn CTV
      { to: '/leadership/contributor-applications', icon: 'fileText', label: 'Duyệt đơn cộng tác viên', title: 'Danh sách đơn đăng ký cộng tác viên', roles: ['DEPUTY_EIC'] },
      // TungTT - Iteration 3 Task 3: Duyệt đơn Expert
      { to: '/leadership/expert-applications', icon: 'award', label: 'Duyệt đơn Chuyên gia', title: 'Xét duyệt nâng cấp Citizen thành Expert', roles: ['DEPUTY_EIC'] },
    ],
  },
  {
    label: 'Quản lý tòa soạn',
    items: [
      // TungTT - Iteration 3 Task 2: Quản lý CTV
      { to: '/leadership/contributor-management', icon: 'users', label: 'Quản lý Cộng tác viên', title: 'Danh sách Cộng tác viên', roles: ['DEPUTY_EIC'] },
      // TungTT - Iteration 3 Task 4: Dashboard hiệu suất tòa soạn
      { to: '/leadership/newsroom-performance', icon: 'activity', label: 'Hiệu suất tòa soạn', title: 'Dashboard hiệu suất và quy trình biên tập' },
      // TungTT - Iteration 3 Task 5: Danh bạ nhân sự biên tập
      { to: '/leadership/editorial-staff', icon: 'users', label: 'Danh bạ nhân sự', title: 'Danh bạ nhân sự và hồ sơ được phân công' },
    ],
  },
]

/**
 * KHUNG BÀN DUYỆT (/leadership/...) cho Phó Tổng biên tập và Tổng biên tập: dùng khung chung ConsoleLayout,
 * cùng giao diện sáng "toà soạn" với bàn Biên tập viên (theme "editor").
 * Mỗi vai trò thấy đúng phần chờ mình duyệt (Phó TBT: DEPUTY_PENDING, Tổng biên tập: EIC_PENDING) — backend lọc.
 * Bảo vệ quyền: App.jsx bọc khung này trong <ProtectedRoute roles={['DEPUTY_EIC', 'EIC']}>.
 */
function LeadershipLayout() {
  const { user } = useAuth()

  return (
    <ConsoleLayout
      theme="editor"
      homePath="/leadership"
      badge="Editorial Board"
      crumbRoot="Bàn duyệt"
      roleLabel={ROLE_LABELS[user?.role] ?? 'Ban biên tập'}
      navGroups={NAV_GROUPS.map(group => ({ ...group, items: group.items.filter(item => !item.roles || item.roles.includes(user?.role)) }))}
      topbarExtra={
        // Khác bàn BTV / admin: Ban biên tập dùng được trang người dùng như mọi vai trò (về trang chủ, hồ sơ, đổi mật khẩu).
        // UserMenu có mục "Bàn biên tập" để quay lại đây; ô tên + ảnh mặc định của ConsoleLayout được ẩn bằng CSS.
        <div className="leadership-topbar">
          <span className="desk-status__date">{formatToday()}</span>
          <Link to="/" className="leadership-topbar__home">
            <Icon name="home" size={16} />
            <span>Trang chủ</span>
          </Link>
          <UserMenu />
        </div>
      }
    />
  )
}

export default LeadershipLayout
