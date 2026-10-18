// Nhãn và tông màu tương ứng với điểm 0–4 (tông màu được tô bằng CSS: .strength--weak/fair/good/strong).
const LEVELS = [
  { label: 'Rất yếu', tone: 'weak' },
  { label: 'Yếu', tone: 'weak' },
  { label: 'Trung bình', tone: 'fair' },
  { label: 'Khá', tone: 'good' },
  { label: 'Mạnh', tone: 'strong' },
]

/**
 * Chấm điểm mật khẩu 0–4, mỗi tiêu chí đạt được +1 điểm:
 *   1. dài từ 8 ký tự   2. có cả chữ thường và chữ HOA
 *   3. có chữ số        4. có ký tự đặc biệt (!@#...) hoặc dài từ 12 ký tự
 * Chỉ để GỢI Ý cho người dùng; điều kiện BẮT BUỘC thật sự nằm ở validators (≥ 8 ký tự, có chữ và số).
 */
function scorePassword(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++
  return score
}

/**
 * Thanh 4 vạch đo độ mạnh mật khẩu, hiện ngay dưới ô mật khẩu ở trang Đăng ký
 * (sau này dùng lại ở Đổi mật khẩu / Đặt lại mật khẩu).
 * CÁCH DÙNG: <PasswordStrength password={form.values.password} />
 */
function PasswordStrength({ password }) {
  if (!password) return null // Chưa gõ gì thì không hiện
  const score = scorePassword(password)
  const { label, tone } = LEVELS[score]

  return (
    // aria-live="polite": trình đọc màn hình đọc lại nhãn khi độ mạnh thay đổi
    <div className={`strength strength--${tone}`} aria-live="polite">
      <div className="strength__bars">
        {[1, 2, 3, 4].map((step) => (
          // Vạch thứ "step" sáng màu nếu điểm >= step
          <span key={step} className={step <= score ? 'is-active' : ''} />
        ))}
      </div>
      <span className="strength__label">Độ mạnh: {label}</span>
    </div>
  )
}

export default PasswordStrength
