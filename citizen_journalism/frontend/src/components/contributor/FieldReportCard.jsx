import EvidenceList from '../submission/EvidenceList'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import { REPORT_CONCLUSION_BY_VALUE, REPORT_RECOMMENDATION_BY_VALUE } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import '../../assets/styles/assignment.css'
import '../../assets/styles/tracking.css' // Thẻ, nội dung (.detail-card, .detail-content)

/**
 * Thẻ XEM BÁO CÁO HIỆN TRƯỜNG đã nộp (chỉ đọc).
 * Dùng ở: routes/contributor/ContributorTaskDetail.jsx (CTV xem lại), routes/editor/EditorSubmissionDetail.jsx.
 *
 * Props: report = FieldReportView từ backend.
 */
function FieldReportCard({ report }) {
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
    </section>
  )
}

export default FieldReportCard
