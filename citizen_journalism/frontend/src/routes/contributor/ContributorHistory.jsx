import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../../components/admin/StatCard'
import AccountLayout from '../../components/layout/AccountLayout'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { assignmentBadge, REPORT_CONCLUSION_BY_VALUE } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import { contributorTaskService } from '../../services/contributorTaskService'
import '../../assets/styles/admin.css' // Thẻ số liệu .stat-card
import '../../assets/styles/assignment.css'
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)
import '../../assets/styles/tracking.css' // Thẻ danh sách .sub-item, .my-subs

/*
 * LỊCH SỬ ĐÓNG GÓP — /contributor/history, chỉ Cộng tác viên (ProtectedRoute trong App.jsx).
 * Mở từ: menu tài khoản -> "Lịch sử đóng góp".
 * Dữ liệu: GET /api/contributor/tasks/history?page=&size= -> FieldReportService.getContributionHistory.
 *
 * Khác với "Nhiệm vụ của tôi" (việc đang và sắp làm, gồm cả nhiệm vụ đã từ chối), trang này chỉ gồm những gì
 * CTV đã nộp: số liệu tổng hợp ở trên, từng báo cáo ở dưới. Bấm vào 1 báo cáo -> /contributor/tasks/<id>
 * để đọc lại toàn bộ báo cáo và phản hồi của Biên tập viên.
 */

const PAGE_SIZE = 10

/** "+5 điểm" / "-5 điểm". */
const formatPoints = (points) => `${points > 0 ? '+' : ''}${points} điểm`

function ContributorHistory() {
  useDocumentTitle('Lịch sử đóng góp')
  const [page, setPage] = useState(0)
  const { data, error, loading } = useAsyncData(() => contributorTaskService.history({ page, size: PAGE_SIZE }), page)
  const summary = data?.summary
  const reports = data?.reports

  return (
    <AccountLayout title="Lịch sử đóng góp" subtitle="Các báo cáo hiện trường và bài viết bạn đã nộp cho toà soạn.">
      <Alert type="error">{error}</Alert>

      {summary && (
        <div className="contribution-stats">
          <StatCard icon="award" tone="orange" label="Điểm hiệu suất" value={summary.performanceScore} />
          <StatCard icon="fileText" tone="blue" label="Báo cáo đã nộp" value={summary.totalReports} />
          <StatCard
            icon="clock"
            tone="green"
            label="Nộp đúng hạn"
            value={summary.onTimeReports}
            hint={summary.lateReports > 0 ? `${summary.lateReports} báo cáo trễ hạn` : undefined}
          />
          <StatCard icon="checkCircle" tone="green" label="Đã được duyệt" value={summary.approvedReports} />
        </div>
      )}

      {!data && loading && (
        <div className="my-subs">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton skeleton--card" />
          ))}
        </div>
      )}

      {reports?.items.length === 0 && (
        <div className="detail-card my-subs__empty">
          <span className="my-subs__empty-icon">
            <Icon name="award" size={30} />
          </span>
          <h2>Chưa có đóng góp nào</h2>
          <p>Báo cáo hiện trường bạn nộp sẽ được lưu ở đây, kèm kết quả duyệt và điểm hiệu suất.</p>
        </div>
      )}

      {reports?.items.length > 0 && (
        <>
          <ul className={`my-subs ${loading ? 'is-loading' : ''}`}>
            {reports.items.map((report) => (
              <ContributionItem key={report.taskId} report={report} />
            ))}
          </ul>
          <Pagination {...reports} onChange={setPage} />
        </>
      )}
    </AccountLayout>
  )
}

/** 1 báo cáo đã nộp. Dòng dưới cùng cho biết hồ sơ gốc đã đi tới đâu, vì kết quả duyệt báo cáo chưa phải là kết quả cuối. */
function ContributionItem({ report }) {
  const badge = assignmentBadge(report)
  const category = CATEGORY_BY_VALUE[report.category]
  const conclusion = REPORT_CONCLUSION_BY_VALUE[report.conclusion]

  return (
    <li>
      <Link to={`/contributor/tasks/${report.taskId}`} className="sub-item">
        <span className={`category-card__icon category-card__icon--${category?.slug ?? 'complaint'}`}>
          <Icon name={category?.icon ?? 'fileText'} size={20} />
        </span>
        <span className="sub-item__main">
          <span className="sub-item__top">
            <span className="sub-item__code">{report.trackingCode}</span>
            <span className="sub-item__category">{category?.label}</span>
          </span>
          <strong className="sub-item__title">{report.articleTitle}</strong>
          <small className="contribution-line">
            Xác minh: {report.submissionTitle} · Kết luận: {conclusion?.label}
          </small>
          <small className="contribution-line">
            Nộp lúc {formatDateTime(report.submittedAt)} · Hồ sơ: {SUBMISSION_STATUS[report.submissionStatus]?.label}
          </small>
        </span>
        <span className="sub-item__side">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <Badge tone={report.onTime ? 'green' : 'red'}>
            {report.onTime ? 'Đúng hạn' : 'Trễ hạn'} {formatPoints(report.pointsChange)}
          </Badge>
        </span>
      </Link>
    </li>
  )
}

export default ContributorHistory
