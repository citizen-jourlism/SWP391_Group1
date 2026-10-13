/**
 * Các hàm định dạng hiển thị dùng chung (ngày tháng...). Theo kiểu Việt Nam (vi-VN).
 */

/** "2026-10-13T15:39:39" -> "13/10/2026" */
export const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '')

/** Dung lượng tệp dễ đọc: 512 -> "512 B", 204800 -> "200 KB", 5242880 -> "5,0 MB" */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`
}

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
