import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

/**
 * Trang hiển thị khi đường dẫn không tồn tại hoặc chức năng chưa được xây dựng (ví dụ /forgot-password lúc này).
 * Được gắn với Route path="*" trong App.jsx. Dùng lại AuthLayout cho đồng bộ giao diện.
 */
function NotFound() {
  useDocumentTitle('Không tìm thấy trang')
  return (
    <AuthLayout title="Trang chưa sẵn sàng" subtitle="Đường dẫn không tồn tại hoặc chức năng đang được xây dựng.">
      <div className="result">
        <div className="result__icon result__icon--muted">
          <Icon name="info" size={40} strokeWidth={1.8} />
        </div>
        <div className="result__actions">
          <Button to="/" block>
            Về trang chủ
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}

export default NotFound
