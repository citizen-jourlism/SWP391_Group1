import { useState } from 'react'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import Icon from '../ui/Icon'
import ProcessSteps from '../submission/ProcessSteps'
import ApplicationSummary from './ApplicationSummary'
import { APPLICATION_STAGES, APPLICATION_STATUS, applicationProgress } from '../../lib/contributor'
import { formatDateTime } from '../../lib/format'
import { contributorService } from '../../services/contributorService'

/**
 * THEO DÕI ĐƠN ĐĂNG KÝ CTV (SRS: Track Contributor Application) — người dân xem đơn của chính mình.
 * Dùng ở: ContributorSection (trang Hồ sơ). CSS: assets/styles/contributor.css.
 *
 * Gồm: nhãn trạng thái + câu giải thích, thanh tiến trình 4 bước (Nộp đơn -> BTV -> Phó TBT -> Thành CTV),
 * ghi chú / lý do từ chối của toà soạn, nội dung đơn + giấy tờ (ApplicationSummary),
 * nút "Rút đơn" (chỉ khi Biên tập viên chưa xét, có hộp xác nhận).
 *
 * Props: application (ApplicationView), onWithdrawn(message) - gọi sau khi rút đơn thành công để trang tải lại.
 */
function ApplicationTracker({ application, onWithdrawn }) {
  const [confirming, setConfirming] = useState(false)
  const status = APPLICATION_STATUS[application.status] ?? { label: application.status, tone: 'neutral' }
  const progress = applicationProgress(application)
  const rejected = application.status === 'REJECTED'

  const withdraw = async () => {
    const response = await contributorService.withdraw(application.id)
    onWithdrawn(response.message)
  }

  return (
    <div className="app-tracker">
      <div className="app-tracker__head">
        <div>
          <span className="app-tracker__meta">
            Đơn #{application.id} · nộp lúc {formatDateTime(application.createdAt)}
          </span>
          <p className="app-tracker__hint">{status.hint}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <ProcessSteps stages={APPLICATION_STAGES} stage={progress.stage} ended={progress.ended} layout="horizontal" />

      {/* Ghi chú của từng cấp duyệt. Bị từ chối ở cấp nào thì ghi chú cấp đó là "Lý do từ chối" (hộp đỏ). */}
      {application.editorNote && (
        <Alert
          type={rejected && !application.deputyReviewedAt ? 'error' : 'info'}
          title={rejected && !application.deputyReviewedAt ? 'Lý do từ chối' : 'Ghi chú của Biên tập viên'}
        >
          {application.editorNote}
          <small className="app-tracker__note-time"> ({formatDateTime(application.editorReviewedAt)})</small>
        </Alert>
      )}
      {application.deputyNote && (
        <Alert type={rejected ? 'error' : 'info'} title={rejected ? 'Lý do từ chối' : 'Ghi chú của Phó Tổng biên tập'}>
          {application.deputyNote}
        </Alert>
      )}

      <ApplicationSummary
        application={application}
        documentPath={(index) => contributorService.documentPath(application.id, index)}
      />

      {application.status === 'PENDING_EDITOR' && (
        <div className="app-tracker__actions">
          <Button variant="secondary" className="btn--sm" onClick={() => setConfirming(true)}>
            <Icon name="x" size={14} />
            Rút đơn
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Rút đơn đăng ký"
        message="Bạn chắc chắn muốn rút đơn này? Bạn vẫn có thể nộp đơn mới sau đó."
        confirmLabel="Rút đơn"
        danger
        onConfirm={withdraw}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}

export default ApplicationTracker
