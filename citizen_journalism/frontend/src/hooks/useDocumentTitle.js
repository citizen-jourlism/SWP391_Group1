import { useEffect } from 'react'

const APP_NAME = 'Tin Nóng Dân Sinh'

/**
 * Đặt tiêu đề tab trình duyệt cho từng trang, ví dụ "Đăng ký tài khoản | Tin Nóng Dân Sinh".
 * TẠI SAO? Ứng dụng React chỉ có 1 file index.html, nên nếu không đổi thì tab nào cũng cùng một tên.
 * Cách dùng: gọi useDocumentTitle('Tên trang') ở đầu component của trang.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
  }, [title])
}
