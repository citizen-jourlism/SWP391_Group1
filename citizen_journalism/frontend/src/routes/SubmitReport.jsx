import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import ReportForm from '../components/submission/ReportForm'
import SubmissionReceipt from '../components/submission/SubmissionReceipt'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { categoryFromSlug } from '../lib/submission'
import { submissionService } from '../services/submissionService'
import { userService } from '../services/userService'
import '../assets/styles/submit.css'

/*
 * TRANG GỬI THÔNG TIN (tin nóng, khiếu nại...) — đường dẫn /submit (khai báo trong App.jsx).
 * Mở từ nút "Gửi thông tin" trên thanh đầu trang và ở trang chủ.
 * Chỉ người dân, cộng tác viên, chuyên gia (ProtectedRoute roles = SUBMITTER_ROLES trong lib/roles.js).
 * Có thể chọn sẵn loại qua đường dẫn: /submit?type=hot-news; mặc định là loại đầu tiên được phép (Khiếu nại).
 *
 * LUỒNG:
 *   1. Mở trang -> tải CÙNG LÚC: tuỳ chọn form (tỉnh/thành, giới hạn tệp) + hồ sơ tài khoản (để điền sẵn họ tên, SĐT...).
 *      Đang tải: hiện khung xám; lỗi: hiện thông báo + nút Thử lại.
 *   2. Hiện ReportForm (form 4 phần) bên trái + cột hướng dẫn bên phải.
 *   3. Gửi thành công -> thay form bằng SubmissionReceipt (mã hồ sơ + PIN).
 *      "Gửi phản ánh khác" -> quay lại form TRỐNG (đổi `formKey` để React tạo form mới hoàn toàn).
 */

const TIPS = [
  ['camera', 'Chụp ảnh tại hiện trường', 'Ảnh rõ nét, thấy được bối cảnh xung quanh giúp toà soạn xác minh nhanh hơn.'],
  ['clock', 'Ghi rõ thời gian, địa điểm', 'Càng cụ thể (giờ, số nhà, địa danh) toà soạn càng dễ kiểm chứng.'],
  ['shield', 'Bảo vệ nguồn tin', 'Bật "Gửi ẩn danh" nếu bạn lo ngại bị lộ danh tính.'],
  ['alertCircle', 'Thông tin trung thực', 'Thông tin sai sự thật có thể bị trừ điểm uy tín và xử lý theo quy định.'],
]

function SubmitReport() {
  useDocumentTitle('Gửi thông tin')
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null) // { options, profile }
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0) // Tăng lên khi bấm "Thử lại"
  const [receipt, setReceipt] = useState(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    // Promise.all: gọi 2 API song song, chờ cả 2 xong (nhanh hơn gọi lần lượt)
    Promise.all([submissionService.getOptions(), userService.getProfile()])
      .then(([options, profile]) => !cancelled && setData({ options: options.data, profile: profile.data }))
      .catch((error) => !cancelled && setLoadError(error.message))
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const retry = () => {
    setLoadError('')
    setReloadToken((value) => value + 1)
  }

  const handleSubmitted = (result) => {
    setReceipt(result)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startNew = () => {
    setReceipt(null)
    setFormKey((value) => value + 1)
    window.scrollTo({ top: 0 })
  }

  return (
    <AccountLayout
      title={receipt ? 'Gửi thông tin thành công' : 'Gửi thông tin tới toà soạn'}
      subtitle={
        receipt
          ? 'Lưu lại mã hồ sơ và mã PIN để theo dõi tiến độ xử lý.'
          : 'Thông tin của bạn được chuyển trực tiếp tới Ban biên tập. Các mục có dấu * là bắt buộc.'
      }
    >
      {receipt ? (
        <SubmissionReceipt receipt={receipt} onNew={startNew} />
      ) : (
        <div className="submit-layout">
          <div className="submit-layout__main">
            {loadError ? (
              <Alert type="error" title="Không tải được biểu mẫu">
                {loadError}
                <div className="alert__actions">
                  <Button variant="secondary" onClick={retry}>
                    <Icon name="refresh" size={16} />
                    Thử lại
                  </Button>
                </div>
              </Alert>
            ) : data ? (
              <ReportForm
                key={formKey}
                options={data.options}
                profile={data.profile}
                initialCategory={categoryFromSlug(searchParams.get('type'))}
                onSubmitted={handleSubmitted}
              />
            ) : (
              <div className="skeleton skeleton--page" />
            )}
          </div>

          {/* ----- Cột hướng dẫn (dính khi cuộn trên màn hình rộng) ----- */}
          <aside className="submit-aside">
            <div className="submit-aside__card">
              <h3>
                <Icon name="info" size={18} />
                Gợi ý để phản ánh được xử lý nhanh
              </h3>
              <ul>
                {TIPS.map(([icon, title, description]) => (
                  <li key={title}>
                    <span className="submit-aside__icon">
                      <Icon name={icon} size={16} />
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="submit-aside__hotline">
              <Icon name="phone" size={20} />
              <span>
                <small>Trường hợp khẩn cấp, gọi đường dây nóng</small>
                <strong>1900 6668</strong>
              </span>
            </div>
          </aside>
        </div>
      )}
    </AccountLayout>
  )
}

export default SubmitReport
