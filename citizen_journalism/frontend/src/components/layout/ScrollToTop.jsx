import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Điều khiển vị trí cuộn khi chuyển trang. Đặt 1 lần duy nhất trong App.jsx.
 *
 * TẠI SAO? React Router chỉ thay nội dung, không tải lại trang, nên trình duyệt GIỮ NGUYÊN vị trí cuộn.
 * Ví dụ: đang cuộn xuống cuối form Đăng ký, bấm gửi -> trang OTP hiện ra nhưng vẫn ở dưới cùng.
 *
 * - Đường dẫn bình thường (/register...): cuộn lên đầu trang.
 * - Đường dẫn có "#" (ví dụ "/#gioi-thieu" từ menu "Giới thiệu" trên thanh đầu trang):
 *   cuộn tới khối có id tương ứng. Trình duyệt tự làm việc này khi tải trang thật, nhưng với
 *   React Router thì phải tự làm.
 * Component này không hiển thị gì (return null), chỉ theo dõi đường dẫn thay đổi.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation() // Ví dụ "/" và "#gioi-thieu"

  useEffect(() => {
    if (hash) {
      // decodeURIComponent: id có thể bị mã hoá trên đường dẫn; slice(1) bỏ dấu "#"
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash]) // Chạy lại mỗi khi đường dẫn hoặc phần "#" đổi

  return null
}

export default ScrollToTop
