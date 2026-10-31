import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'

function EditorReputationResearchDetail() {
  const { id, accountId } = useParams()
  const { data: researchData, error, setData } = useAsyncData(
    () => editorService.getReputationResearch(id),
    id,
  )
  const data = researchData?.detail
  const [decision, setDecision] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  const submitReview = (value) => {
    if (value === 'FAKE_NEWS' && reason.trim().length < 10) {
      setFormError('Vui lòng ghi lý do tin giả, ít nhất 10 ký tự.')
      return
    }
    setFormError('')
    setDecision(value)
  }

  const review = async () => {
    const response = await editorService.reviewResearchReputation(id, {
      decision,
      reason: decision === 'FAKE_NEWS' ? reason.trim() : null,
    })
    setData({ detail: response.data.article, reputationReviewed: true })
    setNotice(response.message)
    setReason('')
  }

  if (error && !data) return <div className="desk-detail"><Link to={`/editor/reputation/accounts/${accountId}`} className="desk-back"><Icon name="arrowLeft" size={16} />Uy tín và xử phạt</Link><Alert type="error">{error}</Alert></div>
  if (!data) return <div className="skeleton skeleton--page" />

  const pending = !researchData.reputationReviewed
  return (
    <div className="desk-detail">
      <Link to={`/editor/reputation/accounts/${accountId}`} className="desk-back"><Icon name="arrowLeft" size={16} />Danh sách bài và uy tín</Link>
      <Alert type="success">{notice}</Alert><Alert type="error">{error}</Alert>
      <section className="admin-panel">
        <div className="admin-panel__header"><div><h2>{data.title}</h2><Badge tone={data.status === 'REJECTED' ? 'red' : pending ? 'orange' : 'green'}>{data.status === 'REJECTED' ? 'Đã từ chối' : pending ? 'Chờ duyệt' : 'Đã duyệt'}</Badge></div><span>Nộp lúc {formatDateTime(data.submittedAt)}</span></div>
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
        {data.editorialNote && <Alert type="error" title="Lý do từ chối">{data.editorialNote}</Alert>}
        {!researchData.reputationReviewed && (
          <>
            <Alert type="info">Bài hợp lệ: +10 điểm, tối đa 100. Tin giả: gỡ bài và -10 điểm. Dưới 80 điểm tài khoản sẽ bị khóa.</Alert>
            <TextField label="Lý do từ chối tin giả" multiline rows={3} counter={2000}
              value={reason} onChange={(event) => { setReason(event.target.value); setFormError('') }}
              hint="Bắt buộc khi đánh giá tin giả, tối thiểu 10 ký tự." error={formError} />
            <div className="review-box__actions">
              <Button variant="danger" onClick={() => submitReview('FAKE_NEWS')}><Icon name="x" size={16} />Tin giả: gỡ bài và trừ 10 điểm</Button>
              <Button onClick={() => submitReview('APPROVE')}><Icon name="check" size={16} />Tin chuẩn: duyệt và cộng 10 điểm</Button>
            </div>
          </>
        )}
        {researchData.reputationReviewed && <Alert type="info">Bài nghiên cứu này đã được tính điểm uy tín và không thể xử lý lần nữa.</Alert>}
      </section>
      <ConfirmDialog
        open={Boolean(decision)}
        title={decision === 'FAKE_NEWS' ? 'Từ chối bài nghiên cứu' : 'Duyệt bài nghiên cứu'}
        message={decision === 'FAKE_NEWS'
          ? 'Bài nghiên cứu sẽ bị từ chối và tác giả bị trừ 10 điểm. Tài khoản sẽ khóa nếu điểm xuống dưới 80.'
          : 'Bài nghiên cứu sẽ được duyệt và tác giả được cộng tối đa 10 điểm, không vượt quá 100.'}
        confirmLabel={decision === 'FAKE_NEWS' ? 'Từ chối và gỡ bài' : 'Duyệt bài và cộng điểm'}
        danger={decision === 'FAKE_NEWS'}
        onConfirm={review}
        onClose={() => setDecision('')}
      />
    </div>
  )
}

export default EditorReputationResearchDetail
