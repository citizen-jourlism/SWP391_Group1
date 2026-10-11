import { Link } from 'react-router-dom'

/**
 * Nút bấm thống nhất toàn trang.
 * - variant: 'primary' | 'secondary' | 'ghost'
 * - loading: hiện vòng xoay và khoá nút
 * - to: nếu có thì render thành link chuyển trang
 */
function Button({ variant = 'primary', block, loading, disabled, to, children, className = '', ...rest }) {
  const classes = `btn btn--${variant} ${block ? 'btn--block' : ''} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export default Button
