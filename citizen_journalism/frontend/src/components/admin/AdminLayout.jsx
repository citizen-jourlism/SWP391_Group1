import ConsoleLayout from '../layout/ConsoleLayout'

/** Các mục của khu quản trị. Thêm trang quản trị mới: thêm 1 dòng ở đây + 1 <Route> con trong App.jsx. */
const NAV_GROUPS = [
  {
    label: 'Quản lý',
    items: [
      { to: '/admin', end: true, icon: 'activity', label: 'Tổng quan', title: 'Tổng quan hệ thống' },
      { to: '/admin/users', icon: 'user', label: 'Tài khoản', title: 'Quản lý tài khoản' },
      { to: '/admin/audit-history', icon: 'activity', label: 'Lịch sử hoạt động', title: 'Lịch sử hoạt động' },
    ],
  },
]

/**
 * KHUNG KHU QUẢN TRỊ (/admin/...): dùng khung chung ConsoleLayout với giao diện TỐI (theme "admin"),
 * cố ý khác hẳn trang người dùng. Bố cục chi tiết xem components/layout/ConsoleLayout.jsx.
 * Bảo vệ quyền: App.jsx bọc khung này trong <ProtectedRoute roles={['SYSTEM_ADMIN']}>.
 */
function AdminLayout() {
  return (
    <ConsoleLayout
      theme="admin"
      homePath="/admin"
      badge="Admin Console"
      crumbRoot="Quản trị"
      roleLabel="Quản trị hệ thống"
      navGroups={NAV_GROUPS}
    />
  )
}

export default AdminLayout
