/**
 * Các hàm định dạng hiển thị dùng chung (ngày tháng...). Theo kiểu Việt Nam (vi-VN).
 */

/** "2026-10-13T15:39:39" -> "13/10/2026" */
export const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '')

/** "2026-10-13T15:39:39" -> "15:39 13/10/2026" */
export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : ''
