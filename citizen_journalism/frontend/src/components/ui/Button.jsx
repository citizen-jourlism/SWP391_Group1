import { Link } from 'react-router-dom'

/**
 * Nút bấm thống nhất toàn trang (CSS: assets/styles/ui.css, mục "Nút bấm").
 *
 * Props:
 *   - variant : 'primary' (cam nổi bật, hành động chính) | 'secondary' (viền trắng) | 'ghost' (không nền)
 *   - block   : true thì nút rộng hết khung
 *   - loading : true thì hiện vòng xoay và KHOÁ nút, tránh người dùng bấm 2 lần gửi trùng dữ liệu
 *   - to      : có thì render thành <Link> chuyển trang (ví dụ to="/login"), trông vẫn như nút
 *
 * CÁCH DÙNG:
 *   <Button type="submit" block loading={form.submitting}>Đăng ký</Button>
 *   <Button to="/" variant="secondary">Về trang chủ</Button>
 */
function Button({ variant = 'primary', block, loading, disabled, to, children, className = '', ...rest }) {
  const classes = `btn btn--${variant} ${block ? 'btn--block' : ''} ${className}`

  // Dùng <Link> của React Router để chuyển trang mà không tải lại toàn bộ web.
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    // type mặc định "button"; muốn nút gửi form thì truyền type="submit"
    <button type="button" className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export default Button
