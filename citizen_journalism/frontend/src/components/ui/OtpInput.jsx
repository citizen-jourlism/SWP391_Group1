import { useEffect, useRef } from 'react'

/**
 * 6 ô nhập mã OTP: tự nhảy ô khi gõ, Backspace lùi ô, dán (paste) cả mã một lần,
 * hỗ trợ tự điền mã từ tin nhắn trên điện thoại (autocomplete="one-time-code").
 * value là chuỗi các chữ số đã nhập liên tiếp, ví dụ "1234".
 */
function OtpInput({ value, onChange, onComplete, length = 6, disabled, invalid }) {
  const inputs = useRef([])

  const focusAt = (index) => inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus()

  // Khi ô trống và đang cho phép nhập (lần đầu vào trang, sau khi báo sai mã...) thì đặt con trỏ vào ô đầu.
  useEffect(() => {
    if (!disabled && value === '') inputs.current[0]?.focus()
  }, [disabled, value])

  const commit = (next) => {
    const code = next.replace(/\D/g, '').slice(0, length)
    onChange(code)
    if (code.length === length) onComplete?.(code)
    return code
  }

  const handleChange = (index, event) => {
    const typed = event.target.value.replace(/\D/g, '')
    if (!typed) return
    commit(value.slice(0, index) + typed + value.slice(index + typed.length))
    focusAt(index + typed.length)
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (value[index]) {
        commit(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index))
        focusAt(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight') {
      focusAt(index + 1)
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const code = commit(event.clipboardData.getData('text'))
    focusAt(code.length)
  }

  // Luôn điền theo thứ tự: bấm vào ô phía sau sẽ được đưa về ô trống đầu tiên.
  const handleFocus = (index, event) => {
    if (index > value.length) focusAt(value.length)
    else event.target.select()
  }

  return (
    <div className={`otp ${invalid ? 'otp--invalid' : ''}`} onPaste={handlePaste}>
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
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          aria-label={`Chữ số thứ ${index + 1}`}
          aria-invalid={invalid}
        />
      ))}
    </div>
  )
}

export default OtpInput
