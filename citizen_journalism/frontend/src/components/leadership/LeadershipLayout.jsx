import ConsoleLayout from '../layout/ConsoleLayout'

const NAV_GROUPS = [
  {
    label: 'Phê duyệt',
    items: [
      { to: '/leadership', end: true, icon: 'user', label: 'Khiếu nại mở khóa', title: 'Xét duyệt mở khóa tài khoản' },
    ],
  },
]

function LeadershipLayout() {
  return (
    <ConsoleLayout
      theme="admin"
      homePath="/leadership"
      badge="Newsroom Leadership"
      crumbRoot="Ban biên tập"
      roleLabel="Lãnh đạo tòa soạn"
      navGroups={NAV_GROUPS}
    />
  )
}

export default LeadershipLayout
