import { useId } from 'react'
import Icon from './Icon'

function Checkbox({ label, error, ...inputProps }) {
  const id = useId()
  return (
    <div className={`checkbox ${error ? 'checkbox--error' : ''}`}>
      <input id={id} type="checkbox" className="checkbox__input" aria-invalid={Boolean(error)} {...inputProps} />
      <label htmlFor={id} className="checkbox__label">
        <span className="checkbox__box" aria-hidden="true">
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
        <span>{label}</span>
      </label>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export default Checkbox
