import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../../components/admin/StatCard'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import SelectField from '../../components/ui/SelectField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { assignmentBadge, isOverdue } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { EDITOR_STAGES, PIPELINE_STAGES, showsStatus } from '../../lib/pipeline'
import { CATEGORY_BY_VALUE, REPORT_CATEGORIES, SUBMISSION_STATUS } from '../../lib/submission'
import { editorService } from '../../services/editorService'
import '../../assets/styles/pipeline.css'
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)

/*
 * TIẾN ĐỘ TOÀ SOẠN — /editor/pipeline (trang con trong EditorLayout, chỉ EDITOR).
 * Luồng: trang này -> editorService.getPipeline -> GET /api/editor/pipeline -> EditorPipelineService.
 *
 * Hàng đợi (/editor/queue) dùng để tìm và lọc từng hồ sơ; trang này dùng để nhìn toàn cảnh: mỗi cột là 1 bước xử lý,
 * nên thấy ngay hồ sơ đang ùn ở đâu, ai đang giữ và nhiệm vụ nào đã quá hạn.
 * Trang chỉ để xem. Bấm vào thẻ -> /editor/queue/<mã> (EditorSubmissionDetail) để xử lý.
 * Thẻ không có thông tin người gửi, để bảo vệ nguồn tin như ở hàng đợi.
 */

const CATEGORY_OPTIONS = REPORT_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))

function EditorPipeline() {
  const [category, setCategory] = useState('')
  const { data, error, loading, reload } = useAsyncData(() => editorService.getPipeline({ category }), category)

  /** Tổng số hồ sơ ở các bước truyền vào. */
  const countOf = (stages) =>
    data?.columns.reduce((sum, column) => sum + (stages.includes(column.stage) ? column.total : 0), 0)

  return (
    <div className="pipeline">
      <div className="pipeline__toolbar">
        <SelectField
          options={CATEGORY_OPTIONS}
          placeholder="Tất cả loại phản ánh"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Lọc theo loại phản ánh"
        />
        <Button variant="secondary" className="btn--sm" onClick={reload}>
          <Icon name="refresh" size={14} />
          Tải lại
        </Button>
      </div>

      <Alert type="error">{error}</Alert>

      {data && (
        <>
          <div className="admin-grid admin-grid--stats">
            <StatCard icon="activity" tone="blue" label="Hồ sơ đang xử lý" value={data.totalOpen} />
            <StatCard icon="edit" tone="orange" label="Cần BTV xử lý" value={countOf(EDITOR_STAGES)} hint="Tiếp nhận, thẩm định, xem báo cáo" />
            <StatCard icon="clock" tone="red" label="Nhiệm vụ quá hạn" value={data.overdueTasks} hint="CTV chưa nộp báo cáo" />
            <StatCard icon="shield" tone="green" label="Chờ lãnh đạo duyệt" value={countOf(['LEADERSHIP'])} />
          </div>

          <div className={`pipeline-board ${loading ? 'is-loading' : ''}`}>
            {data.columns.map((column) => (
              <PipelineColumn key={column.stage} column={column} />
            ))}
          </div>
        </>
      )}

      {!data && loading && <div className="skeleton skeleton--card" />}
    </div>
  )
}

/** 1 cột của bảng. Cột quá dài thì tự cuộn; hồ sơ ngoài giới hạn hiện thành 1 dòng ghi số lượng. */
function PipelineColumn({ column }) {
  const stage = PIPELINE_STAGES[column.stage]
  const hiddenCount = column.total - column.cards.length

  return (
    <section className={`pipeline-column pipeline-column--${stage.tone}`} aria-label={stage.label}>
      <header className="pipeline-column__head">
        <span className="pipeline-column__icon">
          <Icon name={stage.icon} size={15} />
        </span>
        <div>
          <strong>{stage.label}</strong>
          <small>{stage.hint}</small>
        </div>
        <span className="pipeline-column__count">{column.total}</span>
      </header>

      <div className="pipeline-column__cards">
        {column.cards.map((card) => (
          <PipelineCard key={card.trackingCode} card={card} stage={column.stage} />
        ))}
        {column.total === 0 && <p className="pipeline-column__empty">Không có hồ sơ</p>}
        {hiddenCount > 0 && (
          <Link to="/editor/queue" className="pipeline-column__more">
            Còn {hiddenCount} hồ sơ khác, xem ở Hàng đợi
          </Link>
        )}
      </div>
    </section>
  )
}

/** 1 hồ sơ. Phần nhiệm vụ chỉ hiện khi hồ sơ đã từng giao CTV. */
function PipelineCard({ card, stage }) {
  const category = CATEGORY_BY_VALUE[card.category]
  const status = SUBMISSION_STATUS[card.status]
  const task = card.task
  const taskBadge = task && assignmentBadge(task)
  const overdue = task && isOverdue(task)

  return (
    <Link to={`/editor/queue/${card.trackingCode}`} className={`pipeline-card ${overdue ? 'is-overdue' : ''}`}>
      <span className="pipeline-card__top">
        <span className={`category-card__icon category-card__icon--${category?.slug ?? 'complaint'}`}>
          <Icon name={category?.icon ?? 'fileText'} size={14} />
        </span>
        <span className="pipeline-card__code">{card.trackingCode}</span>
      </span>

      <strong className="pipeline-card__title">{card.title}</strong>
      {showsStatus(stage, card.status) && <Badge tone={status?.tone}>{status?.label}</Badge>}

      <small>
        {card.province} · Gửi {formatDateTime(card.createdAt)}
      </small>
      <small>BTV: {card.editorName ?? 'Chưa có người phụ trách'}</small>

      {task && (
        <span className="pipeline-card__task">
          <small>CTV: {task.contributorName}</small>
          <Badge tone={taskBadge.tone}>{taskBadge.label}</Badge>
          {overdue && (
            <small className="pipeline-card__overdue">
              <Icon name="clock" size={12} />
              Quá hạn từ {formatDateTime(task.deadline)}
            </small>
          )}
        </span>
      )}
    </Link>
  )
}

export default EditorPipeline
