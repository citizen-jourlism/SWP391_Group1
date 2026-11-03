import { useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Pagination from '../ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { violationService } from '../../services/violationService'

const ACTIONS = {
  WARNING: 'Cảnh cáo', DEDUCT_POINTS: 'Trừ điểm uy tín', LOCK_ACCOUNT: 'Khóa tài khoản',
  UNLOCK_ACCOUNT: 'Mở khóa tài khoản', RETRACT_CONTENT: 'Thu hồi nội dung',
}
const TYPES = {
  SPAM: 'Tin rác', FALSE_INFORMATION: 'Thông tin sai sự thật', INACCURATE_EVIDENCE: 'Bằng chứng không chính xác',
  COPYRIGHT_VIOLATION: 'Vi phạm bản quyền', HARASSMENT: 'Quấy rối', POLICY_VIOLATION: 'Vi phạm chính sách', OTHER: 'Khác',
}

export default function AppealPenaltyHistory({ scope, appealId }) {
  const [page, setPage] = useState(0)
  const { data, error, loading, reload } = useAsyncData(
    () => violationService.getAppealPenalties(scope, appealId, { page, size: 5 }),
    JSON.stringify([scope, appealId, page]),
  )
  return (
    <section className="admin-panel" aria-busy={loading}>
      <div className="admin-panel__header"><h2>Lịch sử xử phạt tài khoản</h2><span>Các quyết định đã được thực hiện</span></div>
      <Alert type="info">Đối chiếu lịch sử dưới đây với giải trình của người dùng. Khiếu nại hiện áp dụng cho việc mở khóa tài khoản.</Alert>
      <Alert type="error">{error}</Alert>
      {error && <Button variant="secondary" onClick={reload}>Tải lại lịch sử</Button>}
      {loading && !data && <p role="status">Đang tải lịch sử xử phạt…</p>}
      {data?.items.length === 0 && <p>Chưa có quyết định xử phạt được ghi nhận. Tài khoản có thể bị khóa do điểm uy tín hoặc bảo mật đăng nhập.</p>}
      {data?.items.map((item) => (
        <details key={item.id} className="appeal-penalty">
          <summary>#{item.id} · {ACTIONS[item.proposedAction] ?? 'Xử lý vi phạm'} · {formatDateTime(item.approvedAt ?? item.reviewedAt ?? item.createdAt)}</summary>
          <dl className="applicant__facts">
            <div><dt>Loại vi phạm</dt><dd>{TYPES[item.type] ?? item.type}</dd></div>
            <div><dt>Lý do xử phạt</dt><dd className="appeal-text">{item.description}</dd></div>
            {item.evidenceNote && <div><dt>Bằng chứng</dt><dd className="appeal-text">{item.evidenceNote}</dd></div>}
            <div><dt>Điểm bị trừ</dt><dd>{item.pointsDeducted ?? 0}</dd></div>
            {item.submission && <div><dt>Tin bài liên quan</dt><dd>{item.submission.trackingCode} · {item.submission.title}</dd></div>}
            <div><dt>Người báo cáo</dt><dd>{item.reporter?.fullName ?? '—'}</dd></div>
            <div><dt>Người xét duyệt</dt><dd>{item.approver?.fullName ?? item.reviewer?.fullName ?? '—'}</dd></div>
            <div><dt>Ghi chú xử lý</dt><dd className="appeal-text">{item.approvalNote ?? item.reviewNote ?? '—'}</dd></div>
          </dl>
        </details>
      ))}
      {data && <Pagination {...data} onChange={setPage} />}
    </section>
  )
}
