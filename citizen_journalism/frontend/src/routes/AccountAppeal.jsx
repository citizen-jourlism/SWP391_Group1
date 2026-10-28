import { useState } from 'react'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { accountAppealService } from '../services/accountAppealService'

function AccountAppeal() {
  useDocumentTitle('Khiếu nại mở khóa tài khoản')
  const [values, setValues] = useState({ email: '', password: '', reason: '', evidenceNote: '', appealId: '' })
  const [mode, setMode] = useState('create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const update = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'create') {
        const response = await accountAppealService.create({
          email: values.email.trim(),
          password: values.password,
          reason: values.reason.trim(),
          evidenceNote: values.evidenceNote.trim() || null,
        })
        setNotice(`${response.message} Mã khiếu nại: ${response.data.id}.`)
        setValues((current) => ({ ...current, reason: '', evidenceNote: '', appealId: String(response.data.id) }))
      } else {
        const response = await accountAppealService.status({
          appealId: Number(values.appealId),
          email: values.email.trim(),
          password: values.password,
        })
        const statusLabels = {
          PENDING_EDITOR: 'Chờ biên tập viên xem xét',
          PENDING_FINAL: 'Chờ lãnh đạo tòa soạn phê duyệt',
          APPROVED: 'Đã duyệt - tài khoản đã được mở khóa',
          REJECTED: 'Đã từ chối',
        }
        setNotice(`Khiếu nại #${response.data.id}: ${statusLabels[response.data.status] ?? response.data.status}`)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      badge="Hỗ trợ tài khoản"
      title="Khiếu nại mở khóa"
      subtitle="Tài khoản bị khóa có thể gửi yêu cầu để Biên tập viên xem xét và trình lãnh đạo tòa soạn quyết định."
      footer={<a href="/login">Quay lại đăng nhập</a>}
    >
      <div className="desk-tabs" role="tablist" aria-label="Chọn thao tác khiếu nại">
        <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'is-active' : ''} onClick={() => { setMode('create'); setNotice(''); setError('') }}>Gửi khiếu nại</button>
        <button type="button" role="tab" aria-selected={mode === 'status'} className={mode === 'status' ? 'is-active' : ''} onClick={() => { setMode('status'); setNotice(''); setError('') }}>Tra cứu trạng thái</button>
      </div>
      <form className="form" onSubmit={submit}>
        {error && <Alert type="error">{error}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}
        <TextField label="Email tài khoản bị khóa" type="email" autoComplete="username" required value={values.email} onChange={update('email')} />
        <TextField label="Mật khẩu tài khoản" type="password" autoComplete="current-password" required value={values.password} onChange={update('password')} />
        {mode === 'create' ? (
          <>
            <TextField label="Lý do khiếu nại" multiline rows={4} counter={3000} required value={values.reason} onChange={update('reason')} hint="Tối thiểu 20 ký tự. Không gửi mật khẩu hoặc thông tin nhạy cảm khác trong phần giải trình." />
            <TextField label="Bằng chứng / ghi chú" multiline rows={3} counter={2000} value={values.evidenceNote} onChange={update('evidenceNote')} />
          </>
        ) : (
          <TextField label="Mã khiếu nại" type="number" min="1" required value={values.appealId} onChange={update('appealId')} />
        )}
        <Button type="submit" block loading={busy}>{mode === 'create' ? 'Gửi khiếu nại' : 'Tra cứu'}</Button>
      </form>
    </AuthLayout>
  )
}

export default AccountAppeal
