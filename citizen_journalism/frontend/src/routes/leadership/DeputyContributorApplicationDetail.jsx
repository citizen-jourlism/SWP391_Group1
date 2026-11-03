
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ApplicationSummary from '../../components/contributor/ApplicationSummary'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { deputyContributorService } from '../../services/deputyContributorService'

/**
 * TungTT - Trang duyệt Cộng tác viên của Phó Tổng Biên tập.
 *
 * Chỉ thu gọn giao diện, giữ nguyên nghiệp vụ:
 * - APPROVE: nâng tài khoản thành CONTRIBUTOR.
 * - REJECT: yêu cầu đủ ba nội dung phản hồi.
 */
function DeputyContributorApplicationDetail() {
  const { id } = useParams()

  const { data, error, setData } = useAsyncData(
    () => deputyContributorService.get(id),
    id
  )

  // Chỉ hiển thị form từ chối khi người dùng chọn.
  const [showReject, setShowReject] = useState(false)

  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState('')
  const [improvement, setImprovement] = useState('')

  const [decision, setDecision] = useState(null)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  // Thiết lập kiểu hiển thị nhỏ gọn ngay trong component.
  const styles = {
    page: {
      maxWidth: 940,
      margin: '0 auto',
      display: 'grid',
      gap: 16,
    },
    panel: {
      padding: 20,
      borderRadius: 12,
      marginBottom: 0,
    },
    heading: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    facts: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: 12,
      marginTop: 12,
    },
    field: {
      display: 'grid',
      gap: 5,
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
    },
    value: {
      margin: 0,
      overflowWrap: 'anywhere',
    },
    actions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 16,
    },
    form: {
      display: 'grid',
      gap: 12,
      marginTop: 16,
    },
    textarea: {
      width: '100%',
      minHeight: 64,
      padding: 10,
      borderRadius: 8,
      border: '1px solid #bfc5cf',
      font: 'inherit',
      boxSizing: 'border-box',
      resize: 'vertical',
    },
    feedback: {
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    },
  }

  /**
   * Kiểm tra trước khi xác nhận quyết định.
   */
  const askReview = (value) => {
    setFormError('')

    if (value === 'REJECT') {
      if (!reason.trim() || !missing.trim() || !improvement.trim()) {
        setFormError('Vui lòng nhập đủ ba nội dung từ chối.')
        return
      }

      if (
        reason.trim().length > 200 ||
        missing.trim().length > 200 ||
        improvement.trim().length > 200
      ) {
        setFormError('Mỗi nội dung tối đa 200 ký tự.')
        return
      }
    }

    if (value === 'APPROVE' && note.trim().length > 1000) {
      setFormError('Ghi chú tối đa 1000 ký tự.')
      return
    }

    setDecision(value)
  }

  /**
   * Gửi quyết định về Backend.
   * Chỉ cập nhật giao diện sau khi API thành công.
   */
  const submitReview = async () => {
    if (saving || !decision) return

    const payload = decision === 'REJECT'
      ? {
          decision: 'REJECT',
          rejectionReason: reason.trim(),
          missingInformation: missing.trim(),
          improvementRequest: improvement.trim(),
        }
      : {
          decision: 'APPROVE',
          note: note.trim() || null,
        }

    setSaving(true)
    setFormError('')

    try {
      const response = await deputyContributorService.review(id, payload)

      setData(response.data)
      setNotice(response.message || 'Đã xử lý đơn thành công.')

      setDecision(null)
      setShowReject(false)
      setNote('')
      setReason('')
      setMissing('')
      setImprovement('')
    } catch (err) {
      setDecision(null)
      setFormError(
        err?.response?.data?.message ||
        err?.message ||
        'Không thể xử lý đơn. Vui lòng thử lại.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (error && !data) {
    return (
      <div style={styles.page}>
        <Link to="/leadership/contributor-applications">
          ← Quay lại danh sách
        </Link>
        <Alert type="error">{error}</Alert>
      </div>
    )
  }

  if (!data) {
    return <div className="skeleton skeleton--page" />
  }

  const { application, applicant } = data
  const pending = application.status === 'PENDING_DEPUTY'

  return (
    <div style={styles.page}>
      {/* Điều hướng và tiêu đề */}
      <div>
        <Link
          to="/leadership/contributor-applications"
          className="desk-back"
        >
          ← Danh sách đơn cộng tác viên
        </Link>

        <div style={{ ...styles.heading, marginTop: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23 }}>
              Duyệt đơn Cộng tác viên
            </h1>
            <p style={{ margin: '5px 0 0' }}>
              Hồ sơ #{application.id}
            </p>
          </div>

          <strong>
            {application.status === 'PENDING_DEPUTY'
              ? 'Chờ xét duyệt'
              : application.status === 'APPROVED'
                ? 'Đã phê duyệt'
                : application.status === 'REJECTED'
                  ? 'Đã từ chối'
                  : application.status}
          </strong>
        </div>
      </div>

      {notice && <Alert type="success">{notice}</Alert>}
      {formError && <Alert type="error">{formError}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Thông tin người đăng ký */}
      <section className="admin-panel" style={styles.panel}>
        <h2 style={{ margin: 0, fontSize: 17 }}>
          Thông tin người đăng ký
        </h2>

        <div style={styles.facts}>
          <div style={styles.field}>
            <span style={styles.label}>Họ và tên</span>
            <strong>{applicant.fullName || '—'}</strong>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Email</span>
            <p style={styles.value}>{applicant.email || '—'}</p>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Số điện thoại</span>
            <p style={styles.value}>{applicant.phone || '—'}</p>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>CCCD</span>
            <p style={styles.value}>{applicant.citizenId || '—'}</p>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Điểm uy tín</span>
            <p style={styles.value}>
              {applicant.reputationScore ?? '—'}
            </p>
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Ngày nộp đơn</span>
            <p style={styles.value}>
              {formatDateTime(application.createdAt)}
            </p>
          </div>
        </div>
      </section>

      {/* Thông tin hồ sơ, giấy tờ */}
      <section className="admin-panel" style={styles.panel}>
        <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>
          Nội dung hồ sơ
        </h2>

        <ApplicationSummary
          application={application}
          documentPath={(index) =>
            deputyContributorService.documentPath(
              application.id,
              index
            )
          }
        />
      </section>

      {/* Ghi chú đã lưu */}
      {(application.editorNote || application.deputyNote) && (
        <section className="admin-panel" style={styles.panel}>
          <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>
            Lịch sử phản hồi
          </h2>

          {application.editorNote && (
            <div style={{ marginBottom: 12 }}>
              <strong>Biên tập viên</strong>
              <p style={styles.feedback}>
                {application.editorNote}
              </p>
            </div>
          )}

          {application.deputyNote && (
            <div>
              <strong>Phó Tổng Biên tập</strong>
              <p style={styles.feedback}>
                {application.deputyNote}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Khu vực hành động */}
      <section className="admin-panel" style={styles.panel}>
        <h2 style={{ margin: 0, fontSize: 17 }}>
          Quyết định xét duyệt
        </h2>

        {pending ? (
          <>
            <p style={{ margin: '8px 0' }}>
              Phê duyệt sẽ nâng tài khoản thành Cộng tác viên ngay.
            </p>

            {!showReject && (
              <>
                <div style={styles.field}>
                  <label htmlFor="deputy-note" style={styles.label}>
                    Ghi chú phê duyệt (không bắt buộc)
                  </label>

                  <textarea
                    id="deputy-note"
                    style={styles.textarea}
                    rows={2}
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú thêm nếu cần..."
                  />
                </div>

                <div style={styles.actions}>
                  <Button
                    onClick={() => askReview('APPROVE')}
                    disabled={saving}
                  >
                    Phê duyệt
                  </Button>

                  <Button
                    variant="danger"
                    onClick={() => {
                      setShowReject(true)
                      setFormError('')
                    }}
                    disabled={saving}
                  >
                    Từ chối
                  </Button>
                </div>
              </>
            )}

            {/* Chỉ mở form khi chọn Từ chối */}
            {showReject && (
              <div style={styles.form}>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Phản hồi hồ sơ cần bổ sung
                </h3>

                <div style={styles.field}>
                  <label htmlFor="reject-reason" style={styles.label}>
                    Lý do từ chối *
                  </label>
                  <textarea
                    id="reject-reason"
                    style={styles.textarea}
                    maxLength={200}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Vì sao hồ sơ chưa đạt yêu cầu?"
                  />
                </div>

                <div style={styles.field}>
                  <label htmlFor="reject-missing" style={styles.label}>
                    Thông tin còn thiếu *
                  </label>
                  <textarea
                    id="reject-missing"
                    style={styles.textarea}
                    maxLength={200}
                    value={missing}
                    onChange={(e) => setMissing(e.target.value)}
                    placeholder="Cần bổ sung giấy tờ hoặc thông tin gì?"
                  />
                </div>

                <div style={styles.field}>
                  <label htmlFor="reject-improvement" style={styles.label}>
                    Yêu cầu cải thiện *
                  </label>
                  <textarea
                    id="reject-improvement"
                    style={styles.textarea}
                    maxLength={200}
                    value={improvement}
                    onChange={(e) => setImprovement(e.target.value)}
                    placeholder="Hướng dẫn hoàn thiện để gửi lại..."
                  />
                </div>

                <div style={styles.actions}>
                  <Button
                    variant="danger"
                    onClick={() => askReview('REJECT')}
                    disabled={saving}
                  >
                    Xác nhận từ chối
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowReject(false)
                      setFormError('')
                    }}
                    disabled={saving}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Alert type="info">
            Đơn này đã được xử lý, không thể duyệt lại.
          </Alert>
        )}
      </section>

      {/* Hộp thoại xác nhận cuối */}
      <ConfirmDialog
        open={decision !== null}
        title={
          decision === 'APPROVE'
            ? 'Xác nhận phê duyệt'
            : 'Xác nhận từ chối'
        }
        message={
          decision === 'APPROVE'
            ? 'Người đăng ký sẽ trở thành Cộng tác viên ngay.'
            : 'Lưu phản hồi và từ chối đơn đăng ký này?'
        }
        confirmLabel={
          decision === 'APPROVE' ? 'Phê duyệt' : 'Từ chối'
        }
        danger={decision === 'REJECT'}
        onConfirm={submitReview}
        onClose={() => {
          if (!saving) setDecision(null)
        }}
      />
    </div>
  )
}

export default DeputyContributorApplicationDetail
