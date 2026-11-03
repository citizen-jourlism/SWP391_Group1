import Badge from '../ui/Badge'

export const APPEAL_STATUSES = {
  PENDING_EDITOR: { label: 'Chờ sơ duyệt', tone: 'orange' },
  PENDING_FINAL: { label: 'Chờ quyết định cuối', tone: 'purple' },
  APPROVED: { label: 'Đã chấp thuận', tone: 'green' },
  REJECTED: { label: 'Đã từ chối', tone: 'red' },
}

export default function AppealStatus({ status }) {
  const info = APPEAL_STATUSES[status]
  return <Badge tone={info?.tone}>{info?.label ?? status}</Badge>
}
