import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'

function EditorResearchApprovals() {
  const [page, setPage] = useState(0)
  const { data, error, loading } = useAsyncData(
    () => editorService.listResearch({ page, size: 10 }),
    String(page),
  )

  return (
    <section className="admin-panel">
      <div className="admin-panel__header">
        <h2>Bài nghiên cứu chờ xét duyệt</h2>
        <span>Chỉ bài được duyệt mới được tính 10 điểm thưởng cho chuyên gia.</span>
      </div>
      <Alert type="error">{error}</Alert>
      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead><tr><th>Bài nghiên cứu</th><th>Tác giả chuyên gia</th><th>Lĩnh vực</th><th>Ngày nộp</th><th className="data-table__actions" aria-label="Thao tác" /></tr></thead>
          <tbody>
            {!data && loading && Array.from({ length: 4 }, (_, index) => <tr key={index}><td colSpan={5}><div className="skeleton skeleton--row" /></td></tr>)}
            {data?.items.length === 0 && <tr><td colSpan={5} className="data-table__empty"><Icon name="checkCircle" size={28} />Không có bài nghiên cứu chờ duyệt.</td></tr>}
            {data?.items.map((article) => (
              <tr key={article.id}>
                <td><Link to={`/editor/articles/${article.id}`}><strong>{article.title}</strong></Link><div className="data-table__note">{article.abstractText}</div></td>
                <td><strong>{article.authorName}</strong><div className="data-table__note">{article.authorId} · {article.authorEmail}</div></td>
                <td>{article.field || '—'}</td>
                <td>{formatDateTime(article.submittedAt)}</td>
                <td className="data-table__actions"><Link to={`/editor/articles/${article.id}`} className="desk-open">Đọc và duyệt<Icon name="chevronDown" size={14} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination {...data} onChange={setPage} />}
      {data?.items.length > 0 && <div className="data-table__note"><Badge tone="orange">Chờ duyệt</Badge> Duyệt bài sẽ đưa bài vào batch tích lũy điểm thưởng chạy hằng ngày lúc 00:05.</div>}
    </section>
  )
}

export default EditorResearchApprovals
