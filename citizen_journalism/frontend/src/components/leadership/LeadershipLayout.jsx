import ConsoleLayout from '../layout/ConsoleLayout'
import { useAuth } from '../../hooks/useAuth'

const NAV_GROUPS = [
  {
    label: 'Phê duyệt',
    items: [
      { to: '/leadership/appeals', icon: 'user', label: 'Khiếu nại mở khóa', title: 'Xét duyệt mở khóa tài khoản' },
      { to: '/leadership/violations', icon: 'shield', label: 'Báo cáo vi phạm', title: 'Phê duyệt xử lý vi phạm' },
      { to: '/leadership/content', icon: 'fileText', label: 'Nội dung chờ duyệt', title: 'Phê duyệt tin bài' },
      { to: '/leadership/applications', icon: 'award', label: 'Đơn Cộng tác viên', title: 'Phê duyệt nâng cấp CTV' },
    ],
  },
]

function LeadershipLayout() {
  const { user } = useAuth()
  const navGroups = user?.role === 'EIC'
    ? NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => item.to === '/leadership/content') }))
    : NAV_GROUPS
  return (
    <ConsoleLayout
      theme="admin"
      homePath="/leadership"
      badge="Newsroom Leadership"
      crumbRoot="Ban biên tập"
      roleLabel="Lãnh đạo tòa soạn"
      navGroups={navGroups}
    />
  )
}

export default LeadershipLayout
