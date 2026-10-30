import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import FieldReportCard from '../../components/contributor/FieldReportCard'
import AccountLayout from '../../components/layout/AccountLayout'
import { ReasonDialog } from '../../components/research/ResearchEditorial'
import EvidenceList from '../../components/submission/EvidenceList'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { assignmentBadge, isOverdue } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE } from '../../lib/submission'
import { contributorTaskService } from '../../services/contributorTaskService'
import '../../assets/styles/assignment.css'
import '../../assets/styles/tracking.css' // Thẻ, đầu hồ sơ, thông tin sự việc (.detail-card, .detail-head__*, .detail-facts...)

/*
 * CHI TIẾT 1 NHIỆM VỤ — /contributor/tasks/:id, chỉ Cộng tác viên được giao (mở từ ContributorTasks).
 * Luồng: ContributorTaskDetail -> contributorTaskService -> ContributorTaskController -> ContributorTaskService.
 *
 *   - Chờ phản hồi: nút "Nhận nhiệm vụ" và "Từ chối" (bắt buộc lý do). Quá hạn thì không nhận được nữa.
 *   - Đang làm    : nút "Viết báo cáo" (mở ContributorTaskReport) và "Huỷ nhiệm vụ" (bắt buộc lý do).
 *   - Hoàn thành  : xem lại báo cáo đã nộp.
 *   - Đã huỷ      : hiện ai huỷ và lý do.
 * Nội dung chi tiết + tư liệu chỉ có sau khi nhận (backend không gửi trước đó) để bảo vệ nguồn tin.
 * Các API thao tác trả về nhiệm vụ mới nhất -> cập nhật thẳng vào trang, không cần tải lại.
 */

function ContributorTaskDetail() {
  useDocumentTitle('Chi tiết nhiệm vụ')
  const { id } = useParams()
  const { data: task, error, setData } = useAsyncData(() => contributorTaskService.get(id), id)
  const { state } = useLocation() // state.notice: thông báo từ trang viết báo cáo sau khi nộp xong
  const [dialog, setDialog] = useState(null) // Hộp thoại đang mở: 'accept' | 'decline' | 'cancel'
  const [notice, setNotice] = useState(state?.notice ?? '')

  const applyResult = (response) => {
    setData(response.data)
    setNotice(response.message)
  }

  return (
    <AccountLayout title="Chi tiết nhiệm vụ" backLink={{ to: '/contributor/tasks', label: 'Nhiệm vụ của tôi' }}>
      <Alert type="success">{notice}</Alert>
      {error && !task && <Alert type="error">{error}</Alert>}
      {!task && !error && <div className="skeleton skeleton--page" aria-busy="true" aria-label="Đang tải nhiệm vụ" />}

      {task && (
        <div className="detail">
          <TaskHead task={task} onOpenDialog={setDialog} />

          {task.note && (
            <Alert type="info" title="Chỉ dẫn của toà soạn">
              {task.note}
            </Alert>
          )}

          <section className="detail-card">
            <h3>Thông tin sự việc</h3>
            <dl className="detail-facts">
              <div>
                <dt>Thời điểm xảy ra</dt>
                <dd>{formatDateTime(task.incidentAt)}</dd>
              </div>
              <div>
                <dt>Địa điểm</dt>
                <dd>
                  {task.address}, {task.province}
                </dd>
              </div>
              <div className="detail-facts__wide">
                <dt>Tóm tắt</dt>
                <dd>{task.summary}</dd>
              </div>
            </dl>

            {task.content ? (
              <>
                <h4>Nội dung chi tiết</h4>
                <p className="detail-content">{task.content}</p>
                <h4>Tư liệu ({task.evidences.length})</h4>
                <EvidenceList evidences={task.evidences} />
              </>
            ) : (
              <p className="task-locked">
                <Icon name="lock" size={16} />
                Nội dung chi tiết và tư liệu chỉ hiện khi bạn đang thực hiện nhiệm vụ.
              </p>
            )}
          </section>

          {task.report && <FieldReportCard report={task.report} />}
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'accept'}
        title="Nhận nhiệm vụ"
        message={`Bạn nhận nhiệm vụ này và sẽ hoàn thành trước ${formatDateTime(task?.deadline)}?`}
        confirmLabel="Nhận nhiệm vụ"
        onConfirm={async () => applyResult(await contributorTaskService.accept(id))}
        onClose={() => setDialog(null)}
      />
      <ReasonDialog
        open={dialog === 'decline'}
        title="Từ chối nhiệm vụ"
        message="Biên tập viên sẽ nhận được lý do để giao cho Cộng tác viên khác."
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => applyResult(await contributorTaskService.decline(id, reason))}
      />
      <ReasonDialog
        open={dialog === 'cancel'}
        title="Huỷ nhiệm vụ"
        message="Sau khi huỷ, bạn không thể tiếp tục nhiệm vụ này. Biên tập viên sẽ nhận được lý do."
        label="Lý do huỷ"
        confirmLabel="Huỷ nhiệm vụ"
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => applyResult(await contributorTaskService.cancel(id, reason))}
      />
    </AccountLayout>
  )
}

/** Đầu trang: mã hồ sơ, trạng thái, tiêu đề, hạn và các nút thao tác theo trạng thái. */
function TaskHead({ task, onOpenDialog }) {
  const badge = assignmentBadge(task)
  const category = CATEGORY_BY_VALUE[task.category]
  const overdue = isOverdue(task)

  return (
    <section className="detail-card detail-head">
      <div className="detail-head__top">
        <span className="detail-head__code">
          Mã hồ sơ <strong>{task.trackingCode}</strong>
        </span>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <h2>{task.title}</h2>
      <p className="detail-head__meta">
        {category && (
          <span>
            <Icon name={category.icon} size={14} />
            {category.label}
          </span>
        )}
        <span>
          <Icon name="clock" size={14} />
          Hạn hoàn thành {formatDateTime(task.deadline)}
        </span>
        {overdue && <span className="assign-overdue assign-overdue--inline">Quá hạn</span>}
      </p>

      {task.status === 'CANCELLED' && task.cancelReason && (
        <Alert type="warning" title={badge.label}>
          {task.cancelReason}
        </Alert>
      )}

      {task.status === 'ASSIGNED' && (
        <div className="task-actions">
          <Button onClick={() => onOpenDialog('accept')} disabled={overdue}>
            <Icon name="checkCircle" size={16} />
            Nhận nhiệm vụ
          </Button>
          <Button variant="secondary" onClick={() => onOpenDialog('decline')}>
            <Icon name="x" size={16} />
            Từ chối
          </Button>
        </div>
      )}

      {task.status === 'ACCEPTED' && (
        <div className="task-actions">
          <Button to={`/contributor/tasks/${task.id}/report`}>
            <Icon name="edit" size={16} />
            Viết báo cáo
          </Button>
          <Button variant="secondary" onClick={() => onOpenDialog('cancel')}>
            <Icon name="x" size={16} />
            Huỷ nhiệm vụ
          </Button>
        </div>
      )}
    </section>
  )
}

export default ContributorTaskDetail
