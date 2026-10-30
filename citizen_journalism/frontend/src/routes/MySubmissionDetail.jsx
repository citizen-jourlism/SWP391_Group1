import { useState } from 'react'
import { useParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import CancelSubmissionPanel from '../components/submission/CancelSubmissionPanel'
import SubmissionDetail from '../components/submission/SubmissionDetail'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { useAsyncData } from '../hooks/useAsyncData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { countRevisions } from '../lib/revisionHistory'
import { submissionService } from '../services/submissionService'

/*
 * TRANG THEO DÕI 1 HỒ SƠ CỦA TÔI — /account/submissions/:code (ví dụ /account/submissions/KB-2026-0001).
 * Chỉ người dân / CTV / chuyên gia đã đăng nhập; backend chỉ trả hồ sơ nếu đúng là người gửi (không cần PIN).
 * Mở từ: danh sách "Thông tin đã gửi", nút "Theo dõi hồ sơ" ở biên nhận sau khi gửi.
 * Dữ liệu: GET /api/submissions/mine/{code} -> hiển thị bằng SubmissionDetail (dùng chung với trang Tra cứu).
 * Nút "Làm mới" (reload của useAsyncData) tải lại để xem trạng thái mới nhất (toà soạn có thể vừa xử lý).
 * Hồ sơ còn chờ xử lý -> người gửi tự huỷ được (CancelSubmissionPanel, chèn dưới đầu hồ sơ).
 * Hồ sơ đã bổ sung thông tin ít nhất 1 lần -> nút "Lịch sử chỉnh sửa (N)" mở routes/SubmissionHistory.jsx.
 */
function MySubmissionDetail() {
  const { code } = useParams() // Lấy ":code" trên đường dẫn
  useDocumentTitle(`Hồ sơ ${code}`)
  // key = mã hồ sơ: đổi sang hồ sơ khác thì tự tải lại
  const { data: detail, error, loading, reload, setData } = useAsyncData(() => submissionService.getMine(code), code)
  // Mã hồ sơ vừa huỷ thành công -> hiện hộp xanh "Đã huỷ hồ sơ" (lưu theo mã để sang hồ sơ khác thì tự ẩn)
  const [cancelledCode, setCancelledCode] = useState('')

  return (
    <AccountLayout title="Theo dõi hồ sơ" backLink={{ to: '/account/submissions', label: 'Thông tin đã gửi' }}>
      {error ? (
        <Alert type="error" title="Không xem được hồ sơ">
          {error}
          <div className="alert__actions">
            <Button variant="secondary" to="/account/submissions">
              Về danh sách hồ sơ
            </Button>
          </div>
        </Alert>
      ) : detail ? (
        <>
          {cancelledCode === code && (
            <div className="cancel-success">
              <Alert type="success" title={`Đã huỷ hồ sơ ${detail.trackingCode}`}>
                Toà soạn sẽ không xử lý hồ sơ này nữa.
              </Alert>
            </div>
          )}
          <div className="track-result__bar">
            <span>
              <Icon name="clock" size={18} />
              Trạng thái được cập nhật mỗi khi toà soạn xử lý hồ sơ.
            </span>
            {/* span: .track-result__bar > span có sẵn xếp 2 nút cạnh nhau */}
            <span>
              {countRevisions(detail.timeline) > 1 && (
                <Button variant="secondary" className="btn--sm" to={`/account/submissions/${encodeURIComponent(code)}/history`}>
                  <Icon name="clock" size={14} />
                  Lịch sử chỉnh sửa ({countRevisions(detail.timeline)})
                </Button>
              )}
              <Button variant="secondary" className="btn--sm" loading={loading} onClick={reload}>
                {!loading && <Icon name="refresh" size={14} />}
                Làm mới
              </Button>
            </span>
          </div>
          {/* Hồ sơ "Cần bổ sung" -> nút "Bổ sung ngay" mở trang Bổ sung thông tin (routes/SupplementSubmission.jsx) */}
          <SubmissionDetail
            detail={detail}
            supplementLink={`/account/submissions/${encodeURIComponent(code)}/supplement`}
            newReportLink="/submit"
          >
            {/* Kết quả huỷ trả về chi tiết hồ sơ mới -> thay luôn dữ liệu, không cần tải lại */}
            <CancelSubmissionPanel
              detail={detail}
              onCancelled={(next) => {
                setData(next)
                setCancelledCode(code)
              }}
              onReload={reload}
            />
          </SubmissionDetail>
        </>
      ) : (
        <div className="skeleton skeleton--page" />
      )}
    </AccountLayout>
  )
}

export default MySubmissionDetail
