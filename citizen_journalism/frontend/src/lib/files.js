import api from './api'

/**
 * Mở một tệp RIÊNG TƯ (ví dụ ảnh CCCD trong đơn đăng ký CTV) ở tab mới.
 *
 * TẠI SAO không dùng thẻ <a href> bình thường? Tệp này chỉ xem được khi có token đăng nhập, mà token nằm
 * trong header (không phải cookie) nên link thường không mang theo được. Cách làm:
 *   1. Mở sẵn tab trống NGAY khi bấm (nếu mở sau khi chờ tải, trình duyệt sẽ coi là quảng cáo bật lên và chặn).
 *   2. Tải tệp qua axios (tự gắn token) dưới dạng blob = dữ liệu nhị phân.
 *   3. Tạo đường dẫn tạm "blob:..." từ dữ liệu đó rồi cho tab mới mở tới. Thu hồi đường dẫn sau 1 phút.
 *
 * @param path đường dẫn API, ví dụ "/contributor-applications/3/documents/0"
 * @returns Promise; lỗi (không có quyền, không tìm thấy) thì đóng tab và ném lỗi để trang hiện thông báo
 */
export async function openProtectedFile(path) {
  const tab = window.open('', '_blank')
  try {
    const blob = await api.get(path, { responseType: 'blob', timeout: 0 })
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.location.assign(url) // Trình duyệt chặn mở tab: mở ngay trong tab hiện tại
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
