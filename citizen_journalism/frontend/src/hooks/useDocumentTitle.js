import { useEffect } from 'react'

const APP_NAME = 'Tin Nóng Dân Sinh'

/** Đặt tiêu đề tab trình duyệt cho từng trang. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
  }, [title])
}
