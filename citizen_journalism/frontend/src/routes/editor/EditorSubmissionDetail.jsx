import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ApproveSubmissionDialog from '../../components/editor/ApproveSubmissionDialog'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { REJECTABLE_STATUSES } from '../../lib/rejection'
import { REQUESTABLE_STATUSES } from '../../lib/requestInfo'
import { editorService } from '../../services/editorService'
import { reviewStartService } from '../../services/reviewStartService'

/*
 * CHI TIẾT 1 HỒ SƠ TRONG HÀNG ĐỢI — /editor/queue/:code (Biên tập viên).
 * Dữ liệu: GET /api/editor/submissions/{mã}; hiển thị bằng SubmissionDetail (dùng chung với trang người dân theo dõi).
 *
 * Thanh thao tác phía trên: nút "Kiểm tra tin trùng" mở /editor/screening/<mã> (EditorDuplicateCheck). Nút "Từ chối" mở /editor/queue/<mã>/reject (EditorRejectSubmission,
 * chỉ bật khi hồ sơ còn ở bước biên tập). Nút "Yêu cầu bổ sung" mở /editor/queue/<mã>/request-info (EditorRequestInfo,
 * hiện khi hồ sơ Đã tiếp nhận / Đang thẩm định; hồ sơ đang "Cần bổ sung" thì thành "Xem yêu cầu bổ sung").
 * Nút "Duyệt & chuyển Phó TBT" (chỉ với tin nóng Đang thẩm định, tức là đã được tiếp nhận) mở hộp thoại ApproveSubmissionDialog;
 * duyệt xong hồ sơ chuyển "Chờ Phó TBT duyệt", trang cập nhật ngay bằng dữ liệu API trả về (không tải lại).
 * Nút "Tiếp nhận thẩm định" (chỉ hồ sơ Đã tiếp nhận) hỏi xác nhận rồi gọi POST .../start-review: hồ sơ chuyển
 * "Đang thẩm định" và BTV đang đăng nhập thành người phụ trách.
 * Nút "Duyệt kết quả xác minh" (hồ sơ Đang thẩm định) mở /editor/queue/<mã>/verification (EditorVerificationReview):
 * dùng sau khi CTV xác minh thực địa và nộp bài; CTV chưa nộp thì trang đó tự báo chưa thể duyệt.
 * Nút "Giao CTV xác minh" đã ĐẶT SẴN nhưng đang KHOÁ: backend sẽ làm ở bản sau.
 */

const PLANNED_ACTIONS = [{ icon: 'mapPin', label: 'Giao CTV xác minh' }]

function EditorSubmissionDetail() {
  const { code } = useParams()
  const { data, error, setData } = useAsyncData(() => editorService.getSubmission(code), code)
  const [approveOpen, setApproveOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [notice, setNotice] = useState('') // Thông báo thành công sau khi tiếp nhận / duyệt
  // Duyệt chuyển Phó TBT: chỉ tin nóng Đang thẩm định (khớp SubmissionApprovalService.APPROVABLE_STATUSES)
  const canApprove = data?.category === 'HOT_NEWS' && data.status === 'IN_REVIEW'

  const handleApproved = (response) => {
    setData(response.data.submission)
    setNotice(response.message)
    setApproveOpen(false)
  }

  // ConfirmDialog tự hiện lỗi (409 khi BTV khác đã nhận trước...) và tự đóng khi thành công
  const startReview = async () => {
    const response = await reviewStartService.startReview(code)
    setData(response.data)
    setNotice(response.message)
  }

  return (
    <div className="desk-detail">
      <Link to="/editor/queue" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hàng đợi tin bài
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      <Alert type="success">{notice}</Alert>
      {!data && !error && <div className="skeleton skeleton--page" />}

      {data && (
        <>
          <section className="admin-panel desk-actions">
            <div>
              <strong>Xử lý hồ sơ</strong>
              <small>Tiếp nhận hồ sơ mới để thẩm định, duyệt tin nóng đạt yêu cầu để chuyển Phó Tổng biên tập, yêu cầu bổ sung nếu hồ sơ còn thiếu thông tin, từ chối nếu hồ sơ không đạt yêu cầu.</small>
            </div>
            <div className="desk-actions__buttons">
              {data.status === 'PENDING' && (
                <Button variant="secondary" className="btn--sm" onClick={() => setStartOpen(true)}>
                  <Icon name="checkCircle" size={14} />
                  Tiếp nhận thẩm định
                </Button>
              )}
              <Button to={`/editor/screening/${code}`} variant="secondary" className="btn--sm">
                <Icon name="copy" size={14} />
                Kiểm tra tin trùng
              </Button>
              {PLANNED_ACTIONS.map((action) => (
                <Button key={action.label} variant="secondary" className="btn--sm" disabled title="Sắp có">
                  <Icon name={action.icon} size={14} />
                  {action.label}
                </Button>
              ))}
              {(REQUESTABLE_STATUSES.includes(data.status) || data.status === 'NEED_MORE_INFO') && (
                <Button to={`/editor/queue/${code}/request-info`} variant="secondary" className="btn--sm">
                  <Icon name="info" size={14} />
                  {data.status === 'NEED_MORE_INFO' ? 'Xem yêu cầu bổ sung' : 'Yêu cầu bổ sung'}
                </Button>
              )}
              {data.status === 'IN_REVIEW' && (
                <Button to={`/editor/queue/${code}/verification`} variant="secondary" className="btn--sm">
                  <Icon name="mapPin" size={14} />
                  Duyệt kết quả xác minh
                </Button>
              )}
              {canApprove && (
                <Button className="btn--sm" onClick={() => setApproveOpen(true)}>
                  <Icon name="send" size={14} />
                  Duyệt & chuyển Phó TBT
                </Button>
              )}
              {REJECTABLE_STATUSES.includes(data.status) && (
                <Button to={`/editor/queue/${code}/reject`} variant="danger" className="btn--sm">
                  <Icon name="x" size={14} />
                  Từ chối
                </Button>
              )}
            </div>
          </section>
          <SubmissionDetail detail={data} />
          <ConfirmDialog
            open={startOpen}
            title="Tiếp nhận thẩm định"
            message={`Bạn sẽ là Biên tập viên phụ trách hồ sơ ${data.trackingCode}. Hồ sơ chuyển sang trạng thái "Đang thẩm định" và người gửi thấy bước này trong nhật ký xử lý.`}
            confirmLabel="Tiếp nhận"
            onConfirm={startReview}
            onClose={() => setStartOpen(false)}
          />
          {approveOpen && (
            <ApproveSubmissionDialog code={code} onClose={() => setApproveOpen(false)} onApproved={handleApproved} />
          )}
        </>
      )}
    </div>
  )
}

export default EditorSubmissionDetail
