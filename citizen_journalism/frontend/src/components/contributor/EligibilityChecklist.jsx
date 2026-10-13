import Icon from '../ui/Icon'

/**
 * DANH SÁCH ĐIỀU KIỆN đăng ký Cộng tác viên: mỗi điều kiện một dòng, đạt = ✓ xanh, chưa đạt = ✗ đỏ + gợi ý khắc phục.
 * Dữ liệu do backend tính (ContributorApplicationService.checkEligibility) -> frontend chỉ hiển thị, không tự tính lại.
 * Dùng ở: ContributorSection. CSS: assets/styles/contributor.css.
 *
 * Props: checks = [{ key, label, passed, hint }]
 */
function EligibilityChecklist({ checks }) {
  return (
    <ul className="eligibility">
      {checks.map((check) => (
        <li key={check.key} className={check.passed ? 'is-passed' : 'is-failed'}>
          <span className="eligibility__icon">
            <Icon name={check.passed ? 'check' : 'x'} size={13} strokeWidth={3} />
          </span>
          <span>
            <strong>{check.label}</strong>
            {!check.passed && <small>{check.hint}</small>}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default EligibilityChecklist
