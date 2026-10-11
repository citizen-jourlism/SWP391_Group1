import { useEffect, useRef } from 'react'

/**
 * Ô nhập mã OTP gồm 6 ô vuông (dùng ở routes/VerifyOtp.jsx, sau này dùng lại cho Quên mật khẩu).
 * CSS: assets/styles/ui.css, mục "Ô nhập OTP".
 *
 * TRẢI NGHIỆM ĐƯỢC HỖ TRỢ:
 *   - Gõ 1 số thì tự nhảy sang ô kế tiếp; Backspace xoá và lùi về ô trước; phím mũi tên ← → để di chuyển.
 *   - Dán (Ctrl+V) cả mã 6 số một lần thì tự rải vào 6 ô.
 *   - Điện thoại tự gợi ý mã từ tin nhắn (autocomplete="one-time-code").
 *   - Đủ 6 số thì gọi onComplete, nên trang OTP tự gửi xác thực luôn, không cần bấm nút.
 *
 * DỮ LIỆU: `value` là MỘT chuỗi các chữ số đã nhập liên tiếp (ví dụ "1234"), không phải 6 state riêng.
 * Ô thứ i hiển thị ký tự value[i]. Cách này giúp code đơn giản và không thể có "lỗ hổng" giữa các ô.
 *
 * Props: value, onChange(code), onComplete(code), length (mặc định 6), disabled, invalid (tô đỏ + rung).
 */
function OtpInput({ value, onChange, onComplete, length = 6, disabled, invalid }) {
  // Giữ tham chiếu tới 6 thẻ <input> để chủ động di chuyển con trỏ (focus) giữa các ô.
  const inputs = useRef([])

  /** Đặt con trỏ vào ô thứ index (tự giới hạn trong khoảng 0..length-1). */
  const focusAt = (index) => inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus()

  // Khi ô trống và đang cho phép nhập (lần đầu vào trang, sau khi báo sai mã...) thì đặt con trỏ vào ô đầu.
  useEffect(() => {
    if (!disabled && value === '') inputs.current[0]?.focus()
  }, [disabled, value])

  /** Cập nhật mã: chỉ giữ chữ số, cắt tối đa `length` ký tự; đủ ký tự thì gọi onComplete. */
  const commit = (next) => {
    const code = next.replace(/\D/g, '').slice(0, length) // \D = mọi ký tự KHÔNG phải số
    onChange(code)
    if (code.length === length) onComplete?.(code)
    return code
  }

  /** Gõ vào ô thứ index: thay ký tự tại vị trí đó (có thể là nhiều số nếu điện thoại tự điền). */
  const handleChange = (index, event) => {
    const typed = event.target.value.replace(/\D/g, '')
    if (!typed) return // Gõ chữ cái thì bỏ qua
    commit(value.slice(0, index) + typed + value.slice(index + typed.length))
    focusAt(index + typed.length)
  }

  /** Xử lý các phím đặc biệt: Backspace, mũi tên trái/phải. */
  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (value[index]) {
        // Ô hiện tại có số -> xoá số đó
        commit(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        // Ô hiện tại trống -> xoá số ở ô trước và lùi con trỏ về đó
        commit(value.slice(0, index - 1) + value.slice(index))
        focusAt(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight') {
      focusAt(index + 1)
    }
  }

  /** Dán cả mã: lấy chữ số trong clipboard rải vào các ô. */
  const handlePaste = (event) => {
    event.preventDefault()
    const code = commit(event.clipboardData.getData('text'))
    focusAt(code.length)
  }

  // Luôn điền theo thứ tự: bấm vào ô phía sau sẽ được đưa về ô trống đầu tiên.
  // Bấm vào ô đã có số thì bôi đen số đó để gõ đè.
  const handleFocus = (index, event) => {
    if (index > value.length) focusAt(value.length)
    else event.target.select()
  }

  return (
    <div className={`otp ${invalid ? 'otp--invalid' : ''}`} onPaste={handlePaste}>
      {/* Tạo `length` ô nhập. Array.from({ length: 6 }) tạo mảng 6 phần tử để map */}
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          className={`otp__cell ${value[index] ? 'is-filled' : ''}`}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => handleFocus(index, event)}
          inputMode="numeric" // Điện thoại hiện bàn phím số
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}  // Cho phép nhận nhiều ký tự một lúc (khi điện thoại tự điền), handleChange tự rải ra
          disabled={disabled}
          aria-label={`Chữ số thứ ${index + 1}`}
          aria-invalid={invalid}
        />
      ))}
    </div>
  )
}

export default OtpInput
