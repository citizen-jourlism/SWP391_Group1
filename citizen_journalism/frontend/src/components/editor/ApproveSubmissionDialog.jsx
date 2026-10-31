import { useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextField from '../ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { approvalService } from '../../services/approvalService'

/*
 * HỘP THOẠI DUYỆT TIN NÓNG — mở từ nút "Duyệt & chuyển Phó TBT" ở routes/editor/EditorSubmissionDetail.jsx.
 * Luồng: ApproveSubmissionDialog -> approvalService -> EditorController -> SubmissionApprovalService.
 *
 * Khi mở: GET /api/editor/submissions/{mã}/approval -> { submission, approvable, blockedReason, deputyName, approval }
 *   - approvable = false: hiện blockedReason (không phải tin nóng / không ở trạng thái Đang thẩm định), khoá nút duyệt
 *   - deputyName: Phó TBT phụ trách lĩnh vực; null thì ghi chung "Phó Tổng biên tập"
 * Khi xác nhận: POST .../approve { note } -> hồ sơ chuyển "Chờ Phó TBT duyệt". Ghi chú chỉ toà soạn thấy,
 * người gửi không đọc được. Thành công thì gọi onApproved(kết quả) để trang chi tiết cập nhật lại.
 *
 * Trang cha chỉ render hộp thoại khi đang mở, nên mỗi lần mở là tải lại dữ liệu mới.
 */

/** Độ dài tối đa ghi chú gửi Phó TBT, khớp backend (ApproveSubmissionRequest). */
const NOTE_MAX = 1000

function ApproveSubmissionDialog({ code, onClose, onApproved }) {
  const { data, error: loadError } = useAsyncData(() => approvalService.getApproval(code), code)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const approve = async () => {
    if (note.trim().length > NOTE_MAX) {
      setNoteError(`Ghi chú tối đa ${NOTE_MAX} ký tự.`)
      return
    }
    setRunning(true)
    setError('')
    setNoteError('')
    try {
      const response = await approvalService.approve(code, { note: note.trim() })
      onApproved(response)
    } catch (err) {
      // Lỗi theo từng ô (errors.note) hiện dưới ô ghi chú, lỗi chung (409 đã đổi trạng thái...) hiện ở hộp đỏ
      if (err.errors?.note) setNoteError(err.errors.note)
      else setError(err.message)
      setRunning(false)
    }
  }

  const deputy = data?.deputyName ? `Phó Tổng biên tập ${data.deputyName}` : 'Phó Tổng biên tập'

  return (
    <Modal open title="Duyệt tin nóng" onClose={running ? () => { } : onClose}>
      <Alert type="error">{loadError}</Alert>
      {!data && !loadError && <div className="skeleton skeleton--card" />}

      {data && (
        <>
          {data.approvable ? (
            <p className="modal__text">
              Hồ sơ <strong>{data.submission.trackingCode}</strong> sẽ chuyển sang trạng thái{' '}
              <strong>Chờ Phó TBT duyệt</strong> và được gửi tới <strong>{deputy}</strong> phê duyệt tiếp.
              Sau khi duyệt, bạn không thể từ chối hay yêu cầu bổ sung hồ sơ này nữa.
            </p>
          ) : (
            <Alert type="warning">{data.blockedReason}</Alert>
          )}

          {data.approvable && (
            <TextField
              label="Ghi chú gửi Phó Tổng biên tập"
              multiline
              rows={4}
              counter={NOTE_MAX}
              placeholder="Đánh giá của bạn, các điểm Phó TBT cần lưu ý khi duyệt (không bắt buộc)"
              value={note}
              error={noteError}
              onChange={(event) => setNote(event.target.value)}
            />
          )}

          <Alert type="error">{error}</Alert>
          <div className="modal__actions">
            <Button variant="secondary" onClick={onClose} disabled={running}>
              {data.approvable ? 'Huỷ' : 'Đóng'}
            </Button>
            {data.approvable && (
              <Button loading={running} onClick={approve}>
                Duyệt & chuyển Phó TBT
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

export default ApproveSubmissionDialog
