import RoleDistribution from '../../components/admin/RoleDistribution'
import StatCard from '../../components/admin/StatCard'
import UserCell from '../../components/admin/UserCell'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { ROLE_LABELS, ROLE_TONES } from '../../lib/roles'
import { adminService } from '../../services/adminService'

/*
 * TRANG TỔNG QUAN QUẢN TRỊ — /admin (trang con trong AdminLayout, chỉ SYSTEM_ADMIN vào được).
 * Dữ liệu: GET /api/admin/stats (AdminService.getStats ở backend).
 *
 * BỐ CỤC:
 *   - Hàng 4 thẻ số liệu: tổng tài khoản, đang hoạt động, chờ xác thực, đã khoá
 *   - Biểu đồ phân bố theo vai trò  |  Tin/bài + danh sách 5 tài khoản mới đăng ký
 */
function AdminOverview() {
  const { data: stats, error, loading, reload } = useAsyncData(() => adminService.getStats(), 'admin-stats')

  if (error && !loading) {
    return (
      <Alert type="error">
        {error}
        <div className="alert__actions">
          <Button variant="secondary" onClick={reload}>
            Thử lại
          </Button>
        </div>
      </Alert>
    )
  }

  // Đang tải: hiện các khối xám nhấp nháy đúng bố cục để trang không bị "nhảy" khi có dữ liệu
  if (!stats) {
    return (
      <div className="admin-grid admin-grid--stats" aria-busy="true">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="skeleton skeleton--card" />
        ))}
      </div>
    )
  }

  return (
    <>
      <section className="admin-grid admin-grid--stats">
        <StatCard
          icon="user"
          tone="blue"
          label="Tổng tài khoản"
          value={stats.totalUsers}
          hint={`+${stats.newUsersLast7Days} trong 7 ngày qua`}
        />
        <StatCard icon="checkCircle" tone="green" label="Đang hoạt động" value={stats.activeUsers} />
        <StatCard icon="clock" tone="orange" label="Chờ xác thực" value={stats.pendingUsers} hint="Chưa nhập mã OTP" />
        <StatCard icon="lock" tone="red" label="Đã khoá" value={stats.lockedUsers} />
      </section>

      <section className="admin-grid admin-grid--split">
        <article className="admin-panel">
          <header className="admin-panel__header">
            <h2>Phân bố theo vai trò</h2>
            <span>{stats.totalUsers} tài khoản</span>
          </header>
          <RoleDistribution data={stats.usersByRole} />
        </article>

        <div className="admin-stack">
          <article className="admin-panel admin-panel--accent">
            <header className="admin-panel__header">
              <h2>Tin / bài trên hệ thống</h2>
            </header>
            <div className="mini-stats">
              <div>
                <strong>{stats.totalSubmissions}</strong>
                <span>Tổng tin / bài</span>
              </div>
              <div>
                <strong>{stats.pendingSubmissions}</strong>
                <span>Chờ tiếp nhận</span>
              </div>
            </div>
          </article>

          <article className="admin-panel">
            <header className="admin-panel__header">
              <h2>Mới đăng ký</h2>
              <Button to="/admin/users" variant="ghost" className="btn--sm">
                Xem tất cả
              </Button>
            </header>
            <ul className="recent-list">
              {stats.recentUsers.map((user) => (
                <li key={user.id}>
                  <UserCell user={user} sub={formatDateTime(user.createdAt)} />
                  <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </>
  )
}

export default AdminOverview
