import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DecisionBar, LeadershipNotes } from '../../components/leadership/LeadershipDecision'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAuth } from '../../hooks/useAuth'
import { REPORT_CONCLUSION_BY_VALUE, REPORT_RECOMMENDATION_BY_VALUE } from '../../lib/assignment'
import { formatDateTime } from '../../lib/format'
import { PRIORITY_INFO } from '../../lib/researchEditorial'
import { leadershipService } from '../../services/leadershipService'

/*
 * CHI TIẾT 1 HỒ SƠ Ở BÀN DUYỆT — /leadership/submissions/:code (Phó TBT / Tổng biên tập).
 * Luồng: nút "Mở" ở LeadershipQueue -> trang này -> leadershipService.getSubmission
 *        -> GET /api/leadership/submissions/{mã} (LeadershipController -> LeadershipService.getSubmission).
 *
 * Hiển thị: thanh quyết định (chỉ khi hồ sơ đang chờ đúng vai trò mình) + ý kiến của toà soạn (ghi chú BTV gửi lên,
 * các lần Phó TBT / TBT đã xử lý) + kết quả xác minh của CTV (nếu có) + toàn bộ hồ sơ (SubmissionDetail dùng chung
 * với trang người dân theo dõi).
 * Quyết định: DecisionBar -> leadershipService.decideSubmission -> POST .../decision. Xong thì hiện thông báo,
 * thay dữ liệu trang bằng kết quả mới (hồ sơ rời khỏi bước chờ mình nên thanh quyết định ẩn đi).
 */
function LeadershipSubmissionDetail() {
  const { code } = useParams()
  const { user } = useAuth()
  const { data, error, setData } = useAsyncData(() => leadershipService.getSubmission(code), code)
  const [notice, setNotice] = useState('')

  const decide = async (body) => {
    const response = await leadershipService.decideSubmission(code, body)
    setNotice(response.message)
    setData(response.data)
  }

  return (
    <div className="desk-detail">
      <Link to="/leadership" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hồ sơ chờ duyệt
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {!data && !error && <div className="skeleton skeleton--page" />}
      <Alert type="success">{notice}</Alert>

      {data && (
        <>
          <section className="admin-panel desk-actions">
            <div>
              <strong>
                Duyệt hồ sơ · {data.detail.trackingCode}{' '}
                {data.priority && <Badge tone={PRIORITY_INFO[data.priority]?.tone}>{PRIORITY_INFO[data.priority]?.label}</Badge>}
              </strong>
              <small>
                Biên tập viên phụ trách: {data.editorName || '—'} · Chuyên mục: {data.categoryName || 'NA'}
              </small>
              {!data.actionable && <small>Hồ sơ không ở bước chờ bạn duyệt, chỉ xem.</small>}
            </div>
            {data.actionable && (
              <DecisionBar
                isEic={user?.role === 'EIC'}
                breaking={data.priority === 'BREAKING'}
                editorLabel={data.editorName ? `Biên tập viên ${data.editorName}` : 'Biên tập viên'}
                editHint="BTV sửa thẳng nội dung hồ sơ, không cần người gửi xác nhận, rồi duyệt lại."
                onDecide={decide}
              />
            )}
          </section>

          <LeadershipNotes notes={data.notes} />
          {data.verification && <VerificationSummary verification={data.verification} />}
          <SubmissionDetail detail={data.detail} />
        </>
      )}
    </div>
  )
}

/** Tóm tắt nhiệm vụ xác minh + báo cáo của CTV (đầy đủ ở màn duyệt kết quả xác minh của BTV). */
function VerificationSummary({ verification }) {
  const { assignment, report } = verification
  const conclusion = report?.conclusion && REPORT_CONCLUSION_BY_VALUE[report.conclusion]
  const recommendation = report?.recommendation && REPORT_RECOMMENDATION_BY_VALUE[report.recommendation]
  return (
    <section className="admin-panel leadership-verify">
      <h2>Kết quả xác minh của Cộng tác viên</h2>
      <dl>
        <dt>Nhiệm vụ</dt>
        <dd>{assignment.title}</dd>
        <dt>Cộng tác viên</dt>
        <dd>{assignment.contributorName || 'Chưa có người nhận'}</dd>
        <dt>Nộp lúc</dt>
        <dd>{assignment.submittedAt ? formatDateTime(assignment.submittedAt) : 'Chưa nộp'}</dd>
        {report && (
          <>
            <dt>Kết luận</dt>
            <dd>{conclusion ? <Badge tone={conclusion.tone}>{conclusion.label}</Badge> : '—'}</dd>
            <dt>Đề xuất</dt>
            <dd>{recommendation ? <Badge tone={recommendation.tone}>{recommendation.label}</Badge> : '—'}</dd>
            {report.findings && (
              <>
                <dt>Phát hiện</dt>
                <dd>{report.findings}</dd>
              </>
            )}
            {report.witnessStatements && (
              <>
                <dt>Lời khai nhân chứng</dt>
                <dd>{report.witnessStatements}</dd>
              </>
            )}
            <dt>Bài CTV viết</dt>
            <dd>
              <b>{report.title}</b>
              {report.summary && `\n${report.summary}`}
            </dd>
          </>
        )}
      </dl>
    </section>
  )
}

export default LeadershipSubmissionDetail
