import { useEffect, useState } from 'react'
import Button from './Button'
import Icon from './Icon'

/**
 * Nút "Sao chép": chép `text` vào bộ nhớ tạm (clipboard) rồi đổi thành "Đã sao chép" trong 2 giây.
 * Dùng ở: CreateUserDialog (chép thông tin đăng nhập), SubmissionReceipt (chép mã hồ sơ, mã PIN).
 *
 * Props: text (nội dung cần chép), label, copiedLabel, variant/className (truyền tiếp cho Button), iconOnly.
 * iconOnly = chỉ hiện icon (nút nhỏ cạnh một mã số); khi đó `label` được dùng làm aria-label/title.
 */
function CopyButton({ text, label = 'Sao chép', copiedLabel = 'Đã sao chép', iconOnly = false, variant = 'secondary', className = '' }) {
  const [copied, setCopied] = useState(false)

  // Sau 2 giây tự trở lại trạng thái ban đầu. Hàm return dọn bộ hẹn giờ nếu nút biến mất trước đó.
  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false) // Trình duyệt chặn clipboard: người dùng vẫn tự bôi đen và chép được
    }
  }

  const currentLabel = copied ? copiedLabel : label
  return (
    <Button
      variant={variant}
      className={`${iconOnly ? 'btn--icon' : ''} ${className}`}
      onClick={copy}
      aria-label={iconOnly ? currentLabel : undefined}
      title={iconOnly ? currentLabel : undefined}
    >
      <Icon name={copied ? 'check' : 'copy'} size={16} />
      {!iconOnly && currentLabel}
    </Button>
  )
}

export default CopyButton
