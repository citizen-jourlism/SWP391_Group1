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
      { to: '/leadership/research', icon: 'edit', label: 'Bài nghiên cứu', title: 'Bài nghiên cứu chờ duyệt' },
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
      navGroups={NAV_GROUPS}
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
