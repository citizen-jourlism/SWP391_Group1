import EvidenceList from '../submission/EvidenceList'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import { FEEDBACK_TYPES, REPORT_CONCLUSION_BY_VALUE, REPORT_RECOMMENDATION_BY_VALUE } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import '../../assets/styles/assignment.css'
import '../../assets/styles/tracking.css' // Thẻ, nội dung (.detail-card, .detail-content)

/**
 * Thẻ XEM BÁO CÁO HIỆN TRƯỜNG đã nộp (chỉ đọc).
 * Dùng ở: routes/contributor/ContributorTaskDetail.jsx (CTV xem lại), routes/editor/EditorSubmissionDetail.jsx.
 *
 * Có thêm phần "Phản hồi của Biên tập viên": lần lượt các yêu cầu và lời nhắn của CTV khi xử lý xong.
 *
 * Props:
 *   - report  : FieldReportView từ backend
 *   - actions : nút thao tác đặt dưới cùng thẻ (Biên tập viên dùng để phản hồi)
 */
function FieldReportCard({ report, actions }) {
  const conclusion = REPORT_CONCLUSION_BY_VALUE[report.conclusion]
  const recommendation = REPORT_RECOMMENDATION_BY_VALUE[report.recommendation]

  return (
    <section className="detail-card report-card">
      <div className="report-card__head">
        <h3>Báo cáo hiện trường</h3>
        <small>
          Nộp lúc {formatDateTime(report.submittedAt)}
          {report.late && <b className="assign-overdue assign-overdue--inline"> · Trễ hạn</b>}
        </small>
      </div>

      <dl className="report-card__facts">
        <div>
          <dt>Kết luận xác minh</dt>
          <dd>
            <Badge tone={conclusion?.tone}>{conclusion?.label ?? report.conclusion}</Badge>
          </dd>
        </div>
        <div>
          <dt>Đề xuất</dt>
          <dd>
            <Badge tone={recommendation?.tone}>{recommendation?.label ?? report.recommendation}</Badge>
          </dd>
        </div>
      </dl>

      <h4>Kết quả tại hiện trường</h4>
      <p className="detail-content">{report.findings}</p>
      <h4>Lời nhân chứng</h4>
      <p className="detail-content">{report.witnessStatements}</p>

      <h4>
        <Icon name="edit" size={15} />
        Bài viết nháp: {report.title}
      </h4>
      <p className="detail-content">{report.content}</p>

      <h4>Tư liệu hiện trường ({report.evidences.length})</h4>
      <EvidenceList evidences={report.evidences} />

      {report.feedbacks.length > 0 && <FeedbackList feedbacks={report.feedbacks} />}
      {actions && <div className="task-actions">{actions}</div>}
    </section>
  )
}

/** Các lần Biên tập viên phản hồi, từ cũ đến mới. */
function FeedbackList({ feedbacks }) {
  return (
    <>
      <h4>Phản hồi của Biên tập viên</h4>
      <ol className="report-feedbacks">
        {feedbacks.map((feedback) => {
          const type = FEEDBACK_TYPES[feedback.type]
          return (
            <li key={feedback.id}>
              <div className="report-feedbacks__head">
                <Badge tone={type.tone}>{type.label}</Badge>
                <small>
                  {feedback.editorName} · {formatDateTime(feedback.createdAt)}
                </small>
              </div>
              {feedback.message && <p>{feedback.message}</p>}
              {feedback.resolvedAt && (
                <p className="report-feedbacks__reply">
                  <b>Đã xử lý lúc {formatDateTime(feedback.resolvedAt)}</b>
                  {feedback.response && `: ${feedback.response}`}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}

export default FieldReportCard
