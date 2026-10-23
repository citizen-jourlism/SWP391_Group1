import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ApplicationSummary from '../../components/contributor/ApplicationSummary'
import ProcessSteps from '../../components/submission/ProcessSteps'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { APPLICATION_STAGES, APPLICATION_STATUS, applicationProgress } from '../../lib/contributor'
import { formatDate, formatDateTime } from '../../lib/format'
import { editorService } from '../../services/editorService'

/*
 * XÉT DUYỆT 1 ĐƠN ĐĂNG KÝ CTV — /editor/applications/:id.
 * Dữ liệu: GET /api/editor/applications/{id} -> { application, applicant }.
 *
 * BỐ CỤC:
 *   - Trái : HỒ SƠ NGƯỜI NỘP (liên hệ, CCCD, tuổi, địa chỉ, điểm uy tín, số tin đã gửi) để đánh giá.
 *   - Phải : tiến trình xét duyệt, nội dung đơn + giấy tờ (ApplicationSummary), khung XÉT DUYỆT.
 *
 * XÉT DUYỆT (chỉ khi đơn "Chờ Biên tập viên xét"): nhập ghi chú rồi chọn
 *   - "Chuyển Phó TBT phê duyệt" (ghi chú không bắt buộc)
 *   - "Từ chối" (BẮT BUỘC ghi lý do, ít nhất 10 ký tự, vì người dân sẽ đọc lý do này)
 * Có hộp xác nhận trước khi gửi. POST /api/editor/applications/{id}/review; người nộp nhận email báo kết quả.
 */

const NOTE_MAX = 1000

/** Tuổi tính từ ngày sinh "YYYY-MM-DD". */
const ageOf = (dateOfBirth) => {
  if (!dateOfBirth) return null
  const birth = new Date(dateOfBirth)
  const now = new Date()
  const hadBirthday = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  return now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1)
}

function EditorApplicationDetail() {
  const { id } = useParams()
  const { data, error, setData } = useAsyncData(() => editorService.getApplication(id), id)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [confirm, setConfirm] = useState(null) // 'FORWARD' | 'REJECT' | null
  const [notice, setNotice] = useState('')

  /** Bấm nút xét duyệt: kiểm tra ghi chú (từ chối phải có lý do) rồi mở hộp xác nhận. */
  const ask = (decision) => {
    const trimmed = note.trim()
    if (decision === 'REJECT' && trimmed.length < 10) {
      setNoteError('Vui lòng ghi rõ lý do từ chối (ít nhất 10 ký tự).')
      return
    }
    if (trimmed.length > NOTE_MAX) {
      setNoteError(`Ghi chú tối đa ${NOTE_MAX} ký tự.`)
      return
    }
    setNoteError('')
    setConfirm(decision)
  }

  /** Gửi kết quả; backend trả về đơn đã cập nhật -> thay dữ liệu luôn, không cần tải lại. */
  const review = async () => {
    const response = await editorService.reviewApplication(id, confirm, note.trim() || null)
    setData(response.data)
    setNotice(response.message)
    setNote('')
  }

  if (error && !data) {
    return (
      <div className="desk-detail">
        <Link to="/editor/applications" className="desk-back">
          <Icon name="arrowLeft" size={16} />
          Đơn đăng ký CTV
        </Link>
        <Alert type="error">{error}</Alert>
      </div>
    )
  }

  if (!data) return <div className="skeleton skeleton--page" />

  const { application, applicant } = data
  const status = APPLICATION_STATUS[application.status]
  const progress = applicationProgress(application)
  const pending = application.status === 'PENDING_EDITOR'

  return (
    <div className="desk-detail">
      <Link to="/editor/applications" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Đơn đăng ký CTV
      </Link>

      <Alert type="success">{notice}</Alert>

      <div className="review-grid">
        {/* ===== Hồ sơ người nộp ===== */}
        <aside className="admin-panel applicant">
          <div className="applicant__head">
            <Avatar name={applicant.fullName} src={applicant.avatarUrl} size={72} />
            <h2>{applicant.fullName}</h2>
            <span className="applicant__id">
              {applicant.id} · thành viên từ {formatDate(applicant.memberSince)}
            </span>
          </div>

          <div className="applicant__stats">
            <div>
              <strong>{applicant.reputationScore ?? 0}</strong>
              <span>Uy tín</span>
            </div>
            <div>
              <strong>{applicant.rewardPoints}</strong>
              <span>Điểm thưởng</span>
            </div>
            <div>
              <strong>{applicant.submissionCount}</strong>
              <span>Tin đã gửi</span>
            </div>
          </div>

          <dl className="applicant__facts">
            <div>
              <dt>
                <Icon name="mail" size={14} /> Email
              </dt>
              <dd>{applicant.email}</dd>
            </div>
            <div>
              <dt>
                <Icon name="phone" size={14} /> Điện thoại
              </dt>
              <dd>{applicant.phone}</dd>
            </div>
            <div>
              <dt>
                <Icon name="creditCard" size={14} /> Số CCCD
              </dt>
              <dd className="data-table__mono">{applicant.citizenId ?? '—'}</dd>
            </div>
            <div>
              <dt>
                <Icon name="calendar" size={14} /> Ngày sinh
              </dt>
              <dd>
                {formatDate(applicant.dateOfBirth) || '—'}
                {applicant.dateOfBirth && ` (${ageOf(applicant.dateOfBirth)} tuổi)`}
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="mapPin" size={14} /> Địa chỉ
              </dt>
              <dd>{applicant.address ?? '—'}</dd>
            </div>
          </dl>
        </aside>

        <div className="admin-stack">
          {/* ===== Tiến trình ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Đơn #{application.id}</h2>
              <Badge tone={status?.tone}>{status?.label ?? application.status}</Badge>
            </div>
            <span className="applicant__id">Nộp lúc {formatDateTime(application.createdAt)}</span>
            <ProcessSteps stages={APPLICATION_STAGES} stage={progress.stage} ended={progress.ended} layout="horizontal" />
            {application.editorNote && (
              <Alert type={application.status === 'REJECTED' ? 'error' : 'info'} title="Ghi chú xét duyệt của Biên tập viên">
                {application.editorNote}
                {application.editorReviewedAt && ` (${formatDateTime(application.editorReviewedAt)})`}
              </Alert>
            )}
          </section>

          {/* ===== Nội dung đơn ===== */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Nội dung đơn</h2>
            </div>
            <ApplicationSummary
              application={application}
              documentPath={(index) => editorService.documentPath(application.id, index)}
            />
          </section>

          {/* ===== Xét duyệt ===== */}
          {pending && (
            <section className="admin-panel review-box">
              <div className="admin-panel__header">
                <h2>Xét duyệt</h2>
                <span>Bước 1/2 · sau đó Phó TBT phê duyệt</span>
              </div>
              <TextField
                label="Ghi chú gửi người đăng ký"
                multiline
                rows={3}
                counter={NOTE_MAX}
                placeholder="Bắt buộc khi từ chối: nêu rõ lý do và hồ sơ cần bổ sung gì."
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setNoteError('')
                }}
                error={noteError}
              />
              <div className="review-box__actions">
                <Button variant="danger" onClick={() => ask('REJECT')}>
                  <Icon name="x" size={16} />
                  Từ chối
                </Button>
                <Button onClick={() => ask('FORWARD')}>
                  <Icon name="send" size={16} />
                  Chuyển Phó TBT phê duyệt
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'REJECT' ? 'Từ chối đơn đăng ký' : 'Chuyển Phó Tổng biên tập phê duyệt'}
        message={
          confirm === 'REJECT'
            ? `Từ chối đơn của ${applicant.fullName}? Người đăng ký sẽ nhận email kèm lý do bạn đã ghi.`
            : `Xác nhận hồ sơ của ${applicant.fullName} đạt yêu cầu và chuyển lên Phó Tổng biên tập phê duyệt?`
        }
        confirmLabel={confirm === 'REJECT' ? 'Từ chối' : 'Chuyển duyệt'}
        danger={confirm === 'REJECT'}
        onConfirm={review}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

export default EditorApplicationDetail
