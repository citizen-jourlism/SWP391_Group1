import { useState } from 'react'
import { useParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import RevisionCompare from '../components/submission/RevisionCompare'
import RevisionList from '../components/submission/RevisionList'
import Alert from '../components/ui/Alert'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDateTime } from '../lib/format'
import { buildStats } from '../lib/revisionHistory'
import { ROLE_LABELS } from '../lib/roles'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../lib/submission'
import { historyService } from '../services/historyService'
import '../assets/styles/tracking.css'
import '../assets/styles/submit.css'
import '../assets/styles/history.css'

/*
 * TRANG LỊCH SỬ CHỈNH SỬA 1 HỒ SƠ CỦA TÔI — /account/submissions/:code/history.
 * Chỉ người dân / CTV / chuyên gia đã đăng nhập, đúng chủ hồ sơ (backend kiểm tra, người khác -> "Không tìm thấy hồ sơ").
 * Mở từ: nút "Lịch sử chỉnh sửa (N)" ở trang Theo dõi hồ sơ (routes/MySubmissionDetail.jsx).
 * Luồng: trang này -> services/historyService.js -> GET /api/submissions/mine/{code}/history
 *        -> SubmissionHistoryController -> SubmissionHistoryService.
 *
 * BỐ CỤC: đầu trang tóm tắt hồ sơ | cột trái các phiên bản (RevisionList) | khung so sánh A ↔ B (RevisionCompare).
 * Mặc định so sánh bản hiện tại (B) với bản ngay trước (A). Hồ sơ chưa bổ sung lần nào -> trạng thái rỗng.
 * Chỉ xem: bản đã gửi không sửa / xoá / khôi phục được.
 */
function SubmissionHistory() {
  const { code } = useParams()
  useDocumentTitle(`Lịch sử chỉnh sửa ${code}`)
  const { user } = useAuth()
  const { data: history, error } = useAsyncData(() => historyService.getMine(code), code)
  // Cặp phiên bản người dùng đã chọn, gắn với mã hồ sơ; khác mã (chưa chọn) -> mặc định bản trước ↔ bản hiện tại
  const [picked, setPicked] = useState({ code: null, from: 0, to: 0 })
  const detailLink = `/account/submissions/${encodeURIComponent(code)}`

  const layout = (content) => (
    <AccountLayout
      title="Lịch sử chỉnh sửa"
      subtitle="Xem lại hồ sơ qua từng lần bổ sung và so sánh những gì đã thay đổi."
      backLink={{ to: detailLink, label: `Theo dõi hồ sơ ${code}` }}
    >
      {content}
    </AccountLayout>
  )

  if (error && !history) {
    return layout(
      <Alert type="error" title="Không xem được lịch sử chỉnh sửa">
        {error}
        <div className="alert__actions">
          <Button variant="secondary" to="/account/submissions">
            Về danh sách hồ sơ
          </Button>
        </div>
      </Alert>,
    )
  }
  if (!history || history.trackingCode.toUpperCase() !== code.toUpperCase()) {
    return layout(<div className="skeleton skeleton--page" />)
  }

  const revisions = history.revisions
  const latest = revisions.length
  const stats = buildStats(revisions)
  const from = picked.code === code ? picked.from : latest - 1
  const to = picked.code === code ? picked.to : latest
  const status = SUBMISSION_STATUS[history.status] ?? { label: history.status, tone: 'neutral' }
  const category = CATEGORY_BY_VALUE[history.category]
  const actorLabel = ROLE_LABELS[user?.role] ?? 'Người gửi'

  // Bấm 1 phiên bản ở cột trái: cũ hơn B -> làm A; mới hơn B -> làm B (A giữ nguyên)
  const pick = (number) => {
    if (number < to) setPicked({ code, from: number, to })
    else if (number > to) setPicked({ code, from, to: number })
  }

  return layout(
    <div className="detail">
      <section className="detail-card rh-head">
        <div>
          <div className="detail-head__top">
            <span className="detail-head__code">
              Mã hồ sơ <strong>{history.trackingCode}</strong>
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <h2>{history.title}</h2>
          <p className="detail-head__meta">
            {category && (
              <span>
                <Icon name={category.icon} size={14} />
                {category.label}
              </span>
            )}
            <span>
              <Icon name="clock" size={14} />
              Gửi lúc {formatDateTime(history.createdAt)}
            </span>
          </p>
        </div>
        <div className="rh-head__stats">
          <span className="rh-stat">
            <Icon name="fileText" size={14} />
            {latest} phiên bản
          </span>
          {latest > 1 && (
            <span className="rh-stat">
              <Icon name="clock" size={14} />
              Sửa gần nhất {formatDateTime(revisions[latest - 1].createdAt)}
            </span>
          )}
        </div>
      </section>

      <div className="rh-layout">
        <RevisionList
          revisions={revisions}
          stats={stats}
          from={latest > 1 ? from : 0}
          to={latest > 1 ? to : 0}
          onPick={pick}
          actorLabel={actorLabel}
        />
        {latest > 1 ? (
          <RevisionCompare
            revisions={revisions}
            stats={stats}
            from={from}
            to={to}
            onChange={(next) => setPicked({ code, ...next })}
          />
        ) : (
          <section className="detail-card rh-empty">
            <span className="rh-empty__icon">
              <Icon name="clock" size={26} />
            </span>
            <h3>Hồ sơ chưa có chỉnh sửa nào</h3>
            <p>
              Mỗi lần bạn bổ sung thông tin theo đề nghị của toà soạn, hệ thống lưu thành một phiên bản mới để bạn so
              sánh tại đây. Hiện hồ sơ chỉ có bản gốc lúc gửi.
            </p>
            <Button variant="secondary" className="btn--sm" to={detailLink}>
              <Icon name="arrowLeft" size={16} />
              Về trang theo dõi
            </Button>
          </section>
        )}
      </div>
    </div>,
  )
}

export default SubmissionHistory
