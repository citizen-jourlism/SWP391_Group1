import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Mỗi khi chuyển sang trang khác thì cuộn lên đầu trang. Đặt 1 lần duy nhất trong App.jsx.
 *
 * TẠI SAO? React Router chỉ thay nội dung, không tải lại trang, nên trình duyệt GIỮ NGUYÊN vị trí cuộn.
 * Ví dụ: đang cuộn xuống cuối form Đăng ký, bấm gửi -> trang OTP hiện ra nhưng vẫn ở dưới cùng.
 * Component này không hiển thị gì (return null), chỉ theo dõi đường dẫn thay đổi.
 */
function ScrollToTop() {
  const { pathname } = useLocation() // Đường dẫn hiện tại, ví dụ "/register"

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname]) // Chạy lại mỗi khi đường dẫn đổi

  return null
}

export default ScrollToTop
