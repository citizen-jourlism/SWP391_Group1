const LEVELS = [
  { label: 'Rất yếu', tone: 'weak' },
  { label: 'Yếu', tone: 'weak' },
  { label: 'Trung bình', tone: 'fair' },
  { label: 'Khá', tone: 'good' },
  { label: 'Mạnh', tone: 'strong' },
]

/** Chấm điểm 0–4 dựa trên độ dài và sự đa dạng ký tự. */
function scorePassword(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++
  return score
}

/** Thanh đo độ mạnh mật khẩu hiển thị ngay dưới ô nhập. */
function PasswordStrength({ password }) {
  if (!password) return null
  const score = scorePassword(password)
  const { label, tone } = LEVELS[score]

  return (
    <div className={`strength strength--${tone}`} aria-live="polite">
      <div className="strength__bars">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={step <= score ? 'is-active' : ''} />
        ))}
      </div>
      <span className="strength__label">Độ mạnh: {label}</span>
    </div>
  )
}

export default PasswordStrength
