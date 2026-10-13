import { useState } from 'react'
import { useForm } from '../../hooks/useForm'
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../lib/roles'
import { createValidator, newPasswordRules, rules } from '../../lib/validators'
import { adminService } from '../../services/adminService'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'

const INITIAL_VALUES = { fullName: '', email: '', phone: '', role: 'EDITOR', password: '' }

const validate = createValidator({
  fullName: [rules.required('Vui lòng nhập họ và tên.'), rules.maxLength(100, 'Họ và tên tối đa 100 ký tự.')],
  email: [rules.required('Vui lòng nhập email.'), rules.email()],
  phone: [rules.required('Vui lòng nhập số điện thoại.'), rules.phone()],
  role: [rules.required('Vui lòng chọn vai trò.')],
  password: newPasswordRules,
})

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))

/**
 * Sinh mật khẩu tạm NGẪU NHIÊN, luôn đạt quy tắc (có chữ HOA, chữ thường, số, ký tự đặc biệt), dài 12 ký tự.
 * crypto.getRandomValues: bộ sinh số ngẫu nhiên an toàn của trình duyệt (Math.random dễ đoán hơn).
 * Bỏ các ký tự dễ nhầm như 0/O, 1/l/I để người nhận gõ lại không bị sai.
 */
function generatePassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*']
  const all = groups.join('')
  const pick = (chars) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]
  const chars = [...groups.map(pick), ...Array.from({ length: 8 }, () => pick(all))]
  return chars.sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 - 0.5).join('')
}

/**
 * Hộp thoại TẠO TÀI KHOẢN NỘI BỘ (Biên tập viên, Phó TBT, Cộng tác viên...) của admin.
 * POST /api/admin/users. Tài khoản dùng được ngay, không cần OTP.
 *
 * Mật khẩu: admin tự đặt hoặc bấm "Tạo ngẫu nhiên". Ô mật khẩu hiện dạng chữ thường (không che)
 * để admin xem và gửi cho người dùng mới. Tạo xong hiện màn hình tóm tắt kèm nút "Sao chép thông tin".
 *
 * Props: open, onClose, onCreated(user) (trang cha tải lại bảng).
 */
function CreateUserDialog({ open, onClose, onCreated }) {
  const form = useForm(INITIAL_VALUES, validate)
  const [created, setCreated] = useState(null) // { user, password } sau khi tạo thành công
  const [copied, setCopied] = useState(false)

  const close = () => {
    form.reset(INITIAL_VALUES)
    setCreated(null)
    setCopied(false)
    onClose()
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await adminService.createUser(values)
    setCreated({ user: response.data, password: values.password })
    onCreated(response.data)
  })

  /** Chép thông tin đăng nhập vào bộ nhớ tạm (clipboard) để dán gửi cho người dùng mới. */
  const copyCredentials = async () => {
    const text = `Tài khoản Tin Nóng Dân Sinh\nEmail: ${created.user.email}\nMật khẩu tạm: ${created.password}\nVui lòng đổi mật khẩu sau khi đăng nhập.`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false) // Trình duyệt chặn clipboard: admin vẫn tự bôi đen và chép được
    }
  }

  return (
    <Modal open={open} title={created ? 'Đã tạo tài khoản' : 'Tạo tài khoản mới'} onClose={close}>
      {created ? (
        // ----- Màn hình tóm tắt sau khi tạo -----
        <div className="form">
          <Alert type="success">
            Đã tạo tài khoản <strong>{created.user.id}</strong> với vai trò {ROLE_LABELS[created.user.role]}.
          </Alert>
          <dl className="credential-box">
            <dt>Email đăng nhập</dt>
            <dd>{created.user.email}</dd>
            <dt>Mật khẩu tạm</dt>
            <dd>
              <code>{created.password}</code>
            </dd>
          </dl>
          <p className="modal__text">Hãy gửi thông tin này cho người dùng và nhắc họ đổi mật khẩu sau khi đăng nhập.</p>
          <div className="modal__actions">
            <Button variant="secondary" onClick={copyCredentials}>
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              {copied ? 'Đã sao chép' : 'Sao chép thông tin'}
            </Button>
            <Button onClick={close}>Xong</Button>
          </div>
        </div>
      ) : (
        // ----- Form tạo tài khoản -----
        <form className="form" onSubmit={onSubmit} noValidate>
          <Alert type="error">{form.formError}</Alert>
          <TextField label="Họ và tên" icon="user" autoFocus required {...form.field('fullName')} />
          <TextField label="Email" icon="mail" type="email" autoComplete="off" required {...form.field('email')} />
          <TextField label="Số điện thoại" icon="phone" type="tel" inputMode="numeric" required {...form.field('phone')} />
          <SelectField label="Vai trò" options={ROLE_OPTIONS} required {...form.field('role')} />
          <p className="field__hint field__hint--block">{ROLE_DESCRIPTIONS[form.values.role]}</p>
          <TextField
            label="Mật khẩu tạm"
            icon="lock"
            autoComplete="new-password"
            hint="Tối thiểu 8 ký tự, gồm chữ và số."
            required
            {...form.field('password')}
          >
            <button type="button" className="link-button field__inline-action" onClick={() => form.setValue('password', generatePassword())}>
              <Icon name="refresh" size={14} /> Tạo mật khẩu ngẫu nhiên
            </button>
          </TextField>
          <div className="modal__actions">
            <Button variant="secondary" onClick={close} disabled={form.submitting}>
              Huỷ
            </Button>
            <Button type="submit" loading={form.submitting}>
              Tạo tài khoản
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default CreateUserDialog
