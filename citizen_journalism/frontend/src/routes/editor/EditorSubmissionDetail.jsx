import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { editorService } from '../../services/editorService'

function EditorSubmissionDetail({ reputationMode = false }) {
  const { code, accountId } = useParams()
  const { data: editorData, error, setData } = useAsyncData(() => editorService.getSubmission(code), code)
  const data = editorData?.detail
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

  const confirmReview = async () => {
    const response = await editorService.reviewReputationSubmission(code, {
      decision,
      reason: decision === 'FAKE_NEWS' ? reason.trim() : null,
    })
    setData(response.data.article)
    setNotice(`${response.message} Điểm uy tín hiện tại: ${response.data.reputationScore}.`)
    setReason('')
  }

  return (
    <div className="desk-detail">
      <Link to={reputationMode ? `/editor/reputation/accounts/${accountId}` : '/editor/queue'} className="desk-back">
        <Icon name="arrowLeft" size={16} />
        {reputationMode ? 'Danh sách bài và uy tín' : 'Hàng đợi tin bài'}
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      <Alert type="success">{notice}</Alert>
      {!data && !error && <div className="skeleton skeleton--page" />}

      {data && (
        <>
          {reputationMode && !editorData.reputationReviewed && (
            <section className="admin-panel desk-actions">
              <div>
                <strong>Đánh giá uy tín bài viết</strong>
                <small>Bài hợp lệ: +5 điểm. Tin giả: gỡ bài và -10 điểm.</small>
              </div>
              <TextField
                label="Lý do từ chối tin giả"
                multiline
                rows={3}
                counter={2000}
                value={reason}
                onChange={(event) => { setReason(event.target.value); setFormError('') }}
                hint="Bắt buộc, tối thiểu 10 ký tự khi chọn tin giả."
                error={formError}
              />
              <div className="desk-actions__buttons">
                <Button variant="danger" className="btn--sm" onClick={() => submitReview('FAKE_NEWS')}>
                  <Icon name="x" size={14} />
                  Từ chối tin giả, gỡ bài và trừ 10 điểm
                </Button>
                <Button className="btn--sm" onClick={() => submitReview('APPROVE')}>
                  <Icon name="checkCircle" size={14} />
                  Xác nhận tin chuẩn, cộng 5 điểm
                </Button>
              </div>
            </section>
          )}
          {reputationMode && editorData.reputationReviewed && (
            <Alert type="info">Bài viết này đã được tính điểm uy tín và không thể xử lý lần nữa.</Alert>
          )}
          <SubmissionDetail detail={data} />
        </>
      )}
      <ConfirmDialog
        open={Boolean(decision)}
        title={decision === 'FAKE_NEWS' ? 'Từ chối tin giả' : 'Duyệt tin chuẩn'}
        message={decision === 'FAKE_NEWS'
          ? 'Bài viết sẽ bị gỡ và tác giả bị trừ 10 điểm. Tài khoản sẽ khóa nếu điểm xuống dưới 80.'
          : 'Bài viết sẽ được chấp thuận và tác giả được cộng tối đa 5 điểm, không vượt quá 100.'}
        confirmLabel={decision === 'FAKE_NEWS' ? 'Từ chối và gỡ bài' : 'Duyệt tin'}
        danger={decision === 'FAKE_NEWS'}
        onConfirm={confirmReview}
        onClose={() => setDecision('')}
      />
    </div>
  )
}

export default EditorSubmissionDetail
