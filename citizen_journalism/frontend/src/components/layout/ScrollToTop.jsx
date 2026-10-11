import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Mỗi khi chuyển sang trang khác thì cuộn lên đầu trang. */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default ScrollToTop
