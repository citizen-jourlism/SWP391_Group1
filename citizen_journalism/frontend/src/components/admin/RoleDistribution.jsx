import { ROLE_LABELS, ROLE_TONES } from '../../lib/roles'

/**
 * Biểu đồ thanh ngang "Phân bố tài khoản theo vai trò" (không cần thư viện biểu đồ: mỗi thanh là 1 thẻ div
 * có chiều rộng = phần trăm so với vai trò đông nhất). CSS: .role-bars* trong admin.css.
 *
 * Props: data = { CITIZEN: 12, EDITOR: 3, ... } (usersByRole từ GET /api/admin/stats)
 */
function RoleDistribution({ data }) {
  const entries = Object.entries(data ?? {})
  const max = Math.max(1, ...entries.map(([, count]) => count)) // tránh chia cho 0 khi chưa có ai
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <ul className="role-bars">
      {entries.map(([role, count]) => (
        <li key={role} className="role-bars__row">
          <span className="role-bars__label">{ROLE_LABELS[role] ?? role}</span>
          <span className="role-bars__track">
            <span
              className={`role-bars__fill role-bars__fill--${ROLE_TONES[role] ?? 'neutral'}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </span>
          <span className="role-bars__value">
            {count}
            <small>{total ? Math.round((count / total) * 100) : 0}%</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default RoleDistribution
