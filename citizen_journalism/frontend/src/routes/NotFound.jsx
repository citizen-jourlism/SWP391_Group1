import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import ResultView from '../components/ui/ResultView'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

/**
 * Trang hiển thị khi đường dẫn không tồn tại hoặc chức năng chưa được xây dựng.
 * Được gắn với Route path="*" trong App.jsx. Dùng lại AuthLayout + ResultView cho đồng bộ giao diện.
 */
function NotFound() {
  useDocumentTitle('Không tìm thấy trang')
  return (
    <AuthLayout title="Trang chưa sẵn sàng" subtitle="Đường dẫn không tồn tại hoặc chức năng đang được xây dựng.">
      <ResultView tone="muted">
        <Button to="/" block>
          Về trang chủ
        </Button>
      </ResultView>
    </AuthLayout>
  )
}

export default NotFound
