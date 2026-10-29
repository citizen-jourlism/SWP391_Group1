import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ResetPasswordDialog from '../../components/admin/ResetPasswordDialog'
import UserCell from '../../components/admin/UserCell'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import SelectField from '../../components/ui/SelectField'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useForm } from '../../hooks/useForm'
import { formatDateTime } from '../../lib/format'
import { toPayload } from '../../lib/payload'
import { ASSIGNABLE_ROLES, ROLE_LABELS, ROLE_TONES, STATUS_INFO } from '../../lib/roles'
import { CITIZEN_ID_LENGTH, createValidator, rules, todayIso } from '../../lib/validators'
import { adminService } from '../../services/adminService'

/*
 * TRANG CHI TIẾT TÀI KHOẢN — /admin/users/:id (trang con trong AdminLayout, chỉ SYSTEM_ADMIN).
 * Mở từ nút sửa ở bảng /admin/users. Luồng: AdminUserDetail -> adminService -> AdminController -> AdminService.
 *
 *   - Cột trái : form sửa họ tên, SĐT, CCCD, ngày sinh, địa chỉ và VAI TRÒ  (PUT /api/admin/users/{id})
 *   - Cột phải : mọi thông tin còn lại, chỉ xem (email, tên đăng nhập, trạng thái, điểm...). Không có mật khẩu.
 * Bấm "Lưu thay đổi": kiểm tra form -> hiện hộp thoại xác nhận -> bấm xác nhận mới gọi API.
 * Tài khoản quản trị: chỉ xem, không có form (backend cũng chặn sửa).
 * Nút "Đặt lại mật khẩu" (cột phải): mở ResetPasswordDialog, admin phải nhập lại mật khẩu của mình.
 */

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))
const UPGRADE_LABELS = { NONE: 'Chưa đăng ký', PENDING: 'Đang chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' }
/** Nhân sự toà soạn: không có điểm uy tín, điểm thưởng, nâng cấp CTV (các mục này dành cho người gửi tin). */
const NEWSROOM_ROLES = ['EDITOR', 'DEPUTY_EIC', 'EIC']
/** Chỉ các vai trò này mới hiện lĩnh vực am hiểu. */
const EXPERTISE_ROLES = ['EXPERT', 'DEPUTY_EIC']

/** Giống trang Hồ sơ của người dùng (routes/Profile.jsx), thêm ô vai trò. */
const validate = createValidator({
  fullName: [rules.required('Vui lòng nhập họ và tên.'), rules.maxLength(100, 'Họ và tên tối đa 100 ký tự.')],
  phone: [rules.required('Vui lòng nhập số điện thoại.'), rules.phone()],
  citizenId: [rules.optional(rules.digits(CITIZEN_ID_LENGTH, `Số CCCD gồm đúng ${CITIZEN_ID_LENGTH} chữ số.`))],
  address: [rules.optional(rules.maxLength(255, 'Địa chỉ tối đa 255 ký tự.'))],
  dateOfBirth: [rules.optional(rules.pastDate('Ngày sinh phải là một ngày trong quá khứ.'))],
  role: [rules.required('Vui lòng chọn vai trò.')],
})

/** Dữ liệu backend -> giá trị form (ô trống dùng '' vì thẻ <input> không nhận null). */
const toFormValues = (user) => ({
  fullName: user.fullName ?? '',
  phone: user.phone ?? '',
  citizenId: user.citizenId ?? '',
  address: user.address ?? '',
  dateOfBirth: user.dateOfBirth ?? '',
  role: user.role,
})

function AdminUserDetail() {
  const { id } = useParams()
  const { data: user, error, reload, setData } = useAsyncData(() => adminService.getUser(id), id)
  const [resetting, setResetting] = useState(false) // Đang mở hộp thoại đặt lại mật khẩu

  if (error && !user) {
    return (
      <Alert type="error">
        {error}
        <div className="alert__actions">
          <Button variant="secondary" onClick={reload}>
            Thử lại
          </Button>
        </div>
      </Alert>
    )
  }
  if (!user) return <div className="skeleton skeleton--page" aria-busy="true" aria-label="Đang tải tài khoản" />

  const statusInfo = STATUS_INFO[user.status]
  const isNewsroom = NEWSROOM_ROLES.includes(user.role)
  // Các thông tin chỉ xem: [nhãn, giá trị]. Thông tin không áp dụng cho vai trò này thì hiện "—".
  const facts = [
    ['Mã tài khoản', user.id],
    ['Email', user.email],
    ['Tên đăng nhập', user.username ? `@${user.username}` : '—'],
    ['Trạng thái', <Badge key="status" tone={statusInfo?.tone}>{statusInfo?.label ?? user.status}</Badge>],
    ['Điểm uy tín', isNewsroom ? '—' : (user.reputationScore ?? 0)],
    ['Điểm thưởng', isNewsroom ? '—' : user.rewardPoints],
    ['Nâng cấp Cộng tác viên', isNewsroom ? '—' : (UPGRADE_LABELS[user.upgradeStatus] ?? '—')],
    ['Lĩnh vực am hiểu', (EXPERTISE_ROLES.includes(user.role) && user.expertiseFields) || '—'],
    ['Khoá tạm tới', user.lockedUntil ? formatDateTime(user.lockedUntil) : '—'],
    ['Ngày tạo', formatDateTime(user.createdAt)],
    ['Cập nhật lần cuối', user.updatedAt ? formatDateTime(user.updatedAt) : '—'],
  ]

  return (
    <>
      <Link to="/admin/users" className="user-detail__back">
        ← Danh sách tài khoản
      </Link>

      <div className="admin-grid admin-grid--split">
        <section className="admin-panel">
          <div className="admin-panel__header">
            <UserCell user={user} />
            <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
          </div>
          {user.role === 'SYSTEM_ADMIN' ? (
            <Alert type="info">Đây là tài khoản quản trị hệ thống, không thể chỉnh sửa.</Alert>
          ) : (
            <UserEditForm key={user.id} user={user} onSaved={setData} />
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <h2>Thông tin tài khoản</h2>
          </div>
          <dl className="user-detail__facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {/* Không đặt lại cho tài khoản admin và tài khoản chưa xác thực (backend cũng chặn) */}
          {user.role !== 'SYSTEM_ADMIN' && user.status !== 'PENDING_OTP' && (
            <Button variant="secondary" block onClick={() => setResetting(true)}>
              <Icon name="lock" size={16} />
              Đặt lại mật khẩu
            </Button>
          )}
        </section>
      </div>

      {/* Đóng hộp thoại thì tải lại: đặt lại mật khẩu có gỡ khoá tạm (dòng "Khoá tạm tới") */}
      <ResetPasswordDialog
        user={user}
        open={resetting}
        onClose={() => {
          setResetting(false)
          reload()
        }}
      />
    </>
  )
}

/** Form sửa (tách riêng để useForm nhận đúng giá trị ban đầu SAU khi tải xong tài khoản). */
function UserEditForm({ user, onSaved }) {
  const form = useForm(toFormValues(user), validate)
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState('')
  const roleChanged = form.values.role !== user.role

  // Gọi API. Lỗi (ví dụ CCCD trùng) được useForm gắn vào đúng ô / hộp lỗi đầu form.
  const save = form.handleSubmit(async (values) => {
    const response = await adminService.updateUser(user.id, toPayload(values))
    form.reset(toFormValues(response.data)) // Đặt mốc mới -> nút Lưu tắt lại
    onSaved(response.data)
    setNotice(response.message)
  })

  return (
    <>
      <form
        className="form"
        noValidate
        // Bước 1: chỉ kiểm tra form; hợp lệ thì mở hộp thoại xác nhận (chưa gọi API)
        onSubmit={form.handleSubmit(() => {
          setNotice('')
          setConfirming(true)
        })}
      >
        <Alert type="success">{notice}</Alert>
        <Alert type="error">{form.formError}</Alert>

        <TextField label="Họ và tên" icon="user" required {...form.field('fullName')} />
        <div className="form__row">
          <TextField label="Số điện thoại" icon="phone" type="tel" inputMode="numeric" required {...form.field('phone')} />
          <TextField
            label="Số căn cước công dân"
            icon="creditCard"
            inputMode="numeric"
            maxLength={CITIZEN_ID_LENGTH}
            placeholder={`${CITIZEN_ID_LENGTH} chữ số`}
            {...form.field('citizenId')}
          />
        </div>
        <div className="form__row">
          <TextField label="Ngày sinh" icon="calendar" type="date" max={todayIso()} {...form.field('dateOfBirth')} />
          <SelectField label="Vai trò" options={ROLE_OPTIONS} required {...form.field('role')} />
        </div>
        <TextField label="Địa chỉ" icon="mapPin" {...form.field('address')} />

        <div className="modal__actions">
          <Button variant="secondary" onClick={() => form.reset()} disabled={!form.isDirty || form.submitting}>
            Huỷ thay đổi
          </Button>
          <Button type="submit" loading={form.submitting} disabled={!form.isDirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>

      {/* Bước 2: xác nhận -> gọi API. Lỗi không hiện trong hộp thoại mà hiện trên form (save tự xử lý). */}
      <ConfirmDialog
        open={confirming}
        title="Xác nhận lưu thay đổi"
        message={
          `Lưu thay đổi cho ${user.fullName} (${user.id})?` +
          (roleChanged
            ? ` Vai trò sẽ đổi từ "${ROLE_LABELS[user.role]}" thành "${ROLE_LABELS[form.values.role]}" và có hiệu lực khi người này đăng nhập lại.`
            : '')
        }
        confirmLabel="Xác nhận lưu"
        onConfirm={() => save()}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

export default AdminUserDetail
