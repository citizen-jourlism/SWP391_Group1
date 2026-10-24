import { useEffect, useState } from 'react'

/**
 * Trả về `value` nhưng CHẬM LẠI `delay` ms: chỉ cập nhật khi người dùng NGỪNG gõ một lúc.
 * Dùng cho ô tìm kiếm của trang admin: gõ "nguyen" sẽ chỉ gọi API 1 lần (sau khi dừng gõ),
 * thay vì 6 lần (n, ng, ngu, nguy...). Giảm tải cho server và tránh kết quả nhảy liên tục.
 */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer) // Gõ tiếp trước khi hết giờ -> huỷ hẹn giờ cũ, đếm lại từ đầu
  }, [value, delay])

  return debounced
}
