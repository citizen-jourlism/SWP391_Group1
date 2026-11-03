import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DecisionBar, LeadershipNotes } from '../../components/leadership/LeadershipDecision'
import ResearchReader from '../../components/research/ResearchReader'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAuth } from '../../hooks/useAuth'
import { PRIORITY_INFO, reviewStatusInfo } from '../../lib/researchEditorial'
import { leadershipService } from '../../services/leadershipService'
import '../../assets/styles/research.css' // Kiểu trình bày bài (.paper, .article-body...) của ResearchReader

/*
 * CHI TIẾT 1 BÀI NGHIÊN CỨU Ở BÀN DUYỆT — /leadership/research/:id (Phó TBT / Tổng biên tập).
 * Luồng: nút "Mở" ở LeadershipQueue (tab Bài nghiên cứu) -> trang này -> leadershipService.getResearch
 *        -> GET /api/leadership/research/{id} (LeadershipController -> LeadershipService.getResearch).
 *
 * Hiển thị: thanh quyết định (khi bài đang chờ đúng vai trò mình) + ý kiến của toà soạn (ghi chú BTV khi duyệt,
 * các lần Ban biên tập xử lý) + toàn bài (ResearchReader dùng chung với trang BTV / Chuyên gia).
 * "Yêu cầu chỉnh sửa" trả bài về BTV đã duyệt (bài về "Chờ duyệt", BTV sửa / yêu cầu Chuyên gia chỉnh sửa rồi duyệt lại).
 */
function LeadershipResearchDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, error, setData } = useAsyncData(() => leadershipService.getResearch(id), id)
  const [notice, setNotice] = useState('')

  const decide = async (body) => {
    const response = await leadershipService.decideResearch(id, body)
    setNotice(response.message)
    setData(response.data)
  }

  const status = data && reviewStatusInfo(data.reviewStatus)
  const priority = data?.priority && PRIORITY_INFO[data.priority]

  return (
    <div className="desk-detail">
      <Link to="/leadership/research" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Bài nghiên cứu chờ duyệt
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {!data && !error && <div className="skeleton skeleton--page" />}
      <Alert type="success">{notice}</Alert>

      {data && (
        <>
          <section className="admin-panel desk-actions">
            <div>
              <strong>
                Duyệt bài nghiên cứu · NC-{data.article.id} <Badge tone={status.tone}>{status.label}</Badge>{' '}
                {priority && <Badge tone={priority.tone}>{priority.label}</Badge>}
              </strong>
              <small>
                Tác giả: {data.authorName} · Lĩnh vực: {data.article.field || 'NA'}
              </small>
              {!data.actionable && <small>Bài không ở bước chờ bạn duyệt, chỉ xem.</small>}
            </div>
            {data.actionable && (
              <DecisionBar
                isEic={user?.role === 'EIC'}
                breaking={data.priority === 'BREAKING'}
                editorLabel="Biên tập viên đã duyệt bài"
                editHint="BTV gửi đề xuất chỉnh sửa, Chuyên gia (tác giả) phải đồng ý thì bài mới đổi, rồi BTV duyệt lại."
                onDecide={decide}
              />
            )}
          </section>

          <LeadershipNotes notes={data.notes} />
          <ResearchReader article={data.article} author={{ fullName: data.authorName }} />
        </>
      )}
    </div>
  )
}

export default LeadershipResearchDetail
