import { useParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import SubmissionDetail from '../components/submission/SubmissionDetail'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { useAsyncData } from '../hooks/useAsyncData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { submissionService } from '../services/submissionService'

/*
 * TRANG THEO DÕI 1 HỒ SƠ CỦA TÔI — /account/submissions/:code (ví dụ /account/submissions/KB-2026-0001).
 * Chỉ người dân / CTV / chuyên gia đã đăng nhập; backend chỉ trả hồ sơ nếu đúng là người gửi (không cần PIN).
 * Mở từ: danh sách "Thông tin đã gửi", nút "Theo dõi hồ sơ" ở biên nhận sau khi gửi.
 * Dữ liệu: GET /api/submissions/mine/{code} -> hiển thị bằng SubmissionDetail (dùng chung với trang Tra cứu).
 * Nút "Làm mới" (reload của useAsyncData) tải lại để xem trạng thái mới nhất (toà soạn có thể vừa xử lý).
 */
function MySubmissionDetail() {
  const { code } = useParams() // Lấy ":code" trên đường dẫn
  useDocumentTitle(`Hồ sơ ${code}`)
  // key = mã hồ sơ: đổi sang hồ sơ khác thì tự tải lại
  const { data: detail, error, loading, reload } = useAsyncData(() => submissionService.getMine(code), code)

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
          <div className="track-result__bar">
            <span>
              <Icon name="clock" size={18} />
              Trạng thái được cập nhật mỗi khi toà soạn xử lý hồ sơ.
            </span>
            <Button variant="secondary" className="btn--sm" loading={loading} onClick={reload}>
              {!loading && <Icon name="refresh" size={14} />}
              Làm mới
            </Button>
          </div>
          <SubmissionDetail detail={detail} />
        </>
      ) : (
        <div className="skeleton skeleton--page" />
      )}
    </AccountLayout>
  )
}

export default MySubmissionDetail
