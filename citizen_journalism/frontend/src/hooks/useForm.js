import { useState } from 'react'

/**
 * Quản lý state của một form: giá trị, lỗi phía client + server, trạng thái đang gửi.
 *
 * Cách dùng:
 *   const form = useForm(initialValues, validate)
 *   <TextField {...form.field('email')} />
 *   <form onSubmit={form.handleSubmit(async (values) => { ... })}>
 *
 * - Lỗi client chỉ hiện sau khi người dùng rời ô nhập (blur) hoặc bấm gửi.
 * - Lỗi server (errors từ API) hiện đúng dưới ô tương ứng, tự xoá khi người dùng sửa ô đó.
 */
export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const clientErrors = validate(values)
  const errorOf = (name) => serverErrors[name] || (touched[name] ? clientErrors[name] : '')

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setServerErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
    setFormError('')
  }

  /** Props gắn thẳng vào ô nhập: value/checked, onChange, onBlur, error. */
  const field = (name) => {
    const isCheckbox = typeof initialValues[name] === 'boolean'
    return {
      name,
      [isCheckbox ? 'checked' : 'value']: values[name],
      onChange: (event) => setValue(name, isCheckbox ? event.target.checked : event.target.value),
      onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
      error: errorOf(name),
    }
  }

  const handleSubmit = (onValid) => async (event) => {
    event?.preventDefault()
    setTouched(Object.fromEntries(Object.keys(initialValues).map((key) => [key, true])))
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await onValid(values)
    } catch (error) {
      setServerErrors(error.errors ?? {})
      setFormError(error.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return { values, setValue, field, errorOf, handleSubmit, submitting, formError, setFormError }
}
