import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'

function EditorResearchApprovalDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => editorService.getResearch(id), id)
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState('')

  const approve = async () => {
    const response = await editorService.approveResearch(id)
    setData(response.data)
    setNotice(response.message)
  }

  if (error && !data) return <div className="desk-detail"><Link to="/editor/articles" className="desk-back"><Icon name="arrowLeft" size={16} />Bài nghiên cứu</Link><Alert type="error">{error}</Alert></div>
  if (!data) return <div className="skeleton skeleton--page" />

  const pending = data.status === 'SUBMITTED'
  return (
    <div className="desk-detail">
      <Link to="/editor/articles" className="desk-back"><Icon name="arrowLeft" size={16} />Bài nghiên cứu</Link>
      <Alert type="success">{notice}</Alert><Alert type="error">{error}</Alert>
      <section className="admin-panel">
        <div className="admin-panel__header"><div><h2>{data.title}</h2><Badge tone={pending ? 'orange' : 'green'}>{pending ? 'Chờ duyệt' : 'Đã duyệt'}</Badge></div><span>Nộp lúc {formatDateTime(data.submittedAt)}</span></div>
        <dl className="applicant__facts">
          <div><dt>Tác giả</dt><dd>{data.authorName} · {data.authorId} · {data.authorEmail}</dd></div>
          <div><dt>Lĩnh vực</dt><dd>{data.field || '—'}</dd></div>
          <div><dt>Từ khóa</dt><dd>{data.keywords || '—'}</dd></div>
          <div><dt>Xung đột lợi ích</dt><dd>{data.hasConflict ? data.conflictNote : 'Không khai báo xung đột'}</dd></div>
          {data.reviewerName && <div><dt>Người duyệt</dt><dd>{data.reviewerName} · {formatDateTime(data.approvedAt)}</dd></div>}
        </dl>
        <h3>Tóm tắt</h3><p>{data.abstractText}</p>
        <h3>Nội dung bài</h3><pre className="content-snapshot">{data.content}</pre>
        {data.referenceList && <><h3>Tài liệu tham khảo</h3><pre className="content-snapshot">{data.referenceList}</pre></>}
        {pending && <div className="review-box__actions"><Button onClick={() => setConfirm(true)}><Icon name="check" size={16} />Duyệt bài và đưa vào tích lũy điểm</Button></div>}
      </section>
      <ConfirmDialog
        open={confirm}
        title="Duyệt bài nghiên cứu"
        message={`Duyệt bài “${data.title}”? Chuyên gia ${data.authorName} sẽ được cộng 10 điểm ở batch hằng ngày kế tiếp.`}
        confirmLabel="Duyệt bài"
        onConfirm={approve}
        onClose={() => setConfirm(false)}
      />
    </div>
  )
}

export default EditorResearchApprovalDetail
