import { useEffect, useState } from 'react'

/** Số giây còn lại từ bây giờ tới mốc timestamp (milliseconds). Không bao giờ âm. */
const secondsUntil = (timestamp) => Math.max(0, Math.ceil(((timestamp ?? 0) - Date.now()) / 1000))

/**
 * Đếm ngược tới một MỐC THỜI GIAN, trả về số giây còn lại và tự cập nhật mỗi giây.
 * Đang dùng ở trang OTP cho "Mã hết hạn sau 04:59" và "Gửi lại sau 59s".
 *
 * TẠI SAO đếm theo mốc thời gian thay vì giảm biến đếm từng giây?
 *   Mốc (ví dụ "hết hạn lúc 23:20:05") được lưu lại, nên tải lại trang hay chuyển tab
 *   thì đồng hồ vẫn chính xác. Nếu chỉ giảm biến đếm thì tải lại trang sẽ bị đếm lại từ đầu.
 *
 * @param targetTimestamp mốc kết thúc (Date.now() + số mili giây)
 */
export function useCountdown(targetTimestamp) {
  // State "tick" không dùng giá trị, chỉ để bắt React vẽ lại giao diện mỗi giây.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (secondsUntil(targetTimestamp) === 0) return undefined // Đã hết giờ thì không cần hẹn giờ
    const timer = setInterval(() => {
      setTick((tick) => tick + 1)
      if (secondsUntil(targetTimestamp) === 0) clearInterval(timer)
    }, 1000)
    // Hàm dọn dẹp: huỷ hẹn giờ khi rời trang hoặc khi mốc thay đổi (ví dụ bấm gửi lại mã).
    return () => clearInterval(timer)
  }, [targetTimestamp])

  return secondsUntil(targetTimestamp)
}

/** Định dạng số giây thành phút:giây, ví dụ 125 -> "02:05". */
export const formatSeconds = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
