import { useState } from 'react'
import AccountLayout from '../components/layout/AccountLayout'
import AvatarUploader from '../components/profile/AvatarUploader'
import ChangeEmailDialog from '../components/profile/ChangeEmailDialog'
import ContributorSection from '../components/contributor/ContributorSection'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import TextField from '../components/ui/TextField'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { formatDate } from '../lib/format'
import { toPayload } from '../lib/payload'
import { ROLE_LABELS } from '../lib/roles'
import { CITIZEN_ID_LENGTH, createValidator, rules, todayIso } from '../lib/validators'
import { userService } from '../services/userService'

/*
 * TRANG HỒ SƠ CÁ NHÂN — đường dẫn /account/profile, BẮT BUỘC đăng nhập (bọc <ProtectedRoute> trong App.jsx).
 * Mở từ menu tài khoản -> "Hồ sơ của tôi". Khung trang: AccountLayout.
 *
 * BỐ CỤC 2 CỘT:
 *   - Trái (thẻ tóm tắt): ảnh đại diện (AvatarUploader), tên, vai trò, ngày tham gia,
 *     ĐIỂM UY TÍN và ĐIỂM THƯỞNG (chỉ xem), nút Đổi mật khẩu.
 *   - Phải (ProfileForm): sửa họ tên, SĐT, CCCD, ngày sinh, địa chỉ; email đổi qua hộp thoại xác nhận OTP.
 *     Bên dưới (chỉ người dân / CTV): mục "Cộng tác viên" = đăng ký + theo dõi đơn CTV (ContributorSection).
 *
 * DỮ LIỆU: tải bằng GET /api/users/me khi mở trang. Sau mỗi lần lưu, backend trả về hồ sơ mới
 * -> cập nhật state `profile` + gọi updateUser() để menu tài khoản (tên, ảnh) đổi theo ngay.
 */

/** Đổi hồ sơ từ backend thành giá trị cho form (ô trống dùng '' vì thẻ <input> không nhận null). */
const toFormValues = (profile) => ({
  fullName: profile.fullName ?? '',
  phone: profile.phone ?? '',
  citizenId: profile.citizenId ?? '',
  address: profile.address ?? '',
  dateOfBirth: profile.dateOfBirth ?? '',
})

// Chiều ngược lại (form -> backend, ô trống gửi null) dùng toPayload trong lib/payload.js

/** Vai trò thấy mục "Cộng tác viên": người dân (đăng ký) và CTV (xem lại). */
const CONTRIBUTOR_SECTION_ROLES = ['CITIZEN', 'CONTRIBUTOR']

const validate = createValidator({
  fullName: [rules.required('Vui lòng nhập họ và tên.'), rules.maxLength(100, 'Họ và tên tối đa 100 ký tự.')],
  phone: [rules.required('Vui lòng nhập số điện thoại.'), rules.phone()],
  citizenId: [rules.optional(rules.digits(CITIZEN_ID_LENGTH, `Số CCCD gồm đúng ${CITIZEN_ID_LENGTH} chữ số.`))],
  address: [rules.optional(rules.maxLength(255, 'Địa chỉ tối đa 255 ký tự.'))],
  dateOfBirth: [rules.optional(rules.pastDate('Ngày sinh phải là một ngày trong quá khứ.'))],
})

function Profile() {
  useDocumentTitle('Hồ sơ của tôi')
  const { updateUser } = useAuth()
  const [notice, setNotice] = useState('') // Thông báo thành công chung của trang
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  // Tải hồ sơ 1 lần khi mở trang. reload = nút "Thử lại" khi tải lỗi (ví dụ backend chưa chạy);
  // setProfile = thay hồ sơ bằng bản mới backend trả về sau khi lưu (không cần gọi lại API).
  const { data: profile, error: loadError, loading, reload, setData: setProfile } = useAsyncData(
    () => userService.getProfile(),
    'profile',
  )

  /** Mọi thay đổi (thông tin, ảnh, email) đều đi qua đây: lưu hồ sơ mới + đồng bộ menu tài khoản + báo thành công. */
  const applyProfile = (updated, message) => {
    setProfile(updated)
    updateUser({ fullName: updated.fullName, email: updated.email, avatarUrl: updated.avatarUrl })
    setNotice(message)
  }

  return (
    <AccountLayout title="Hồ sơ của tôi" subtitle="Quản lý thông tin cá nhân, ảnh đại diện và bảo mật tài khoản.">
      {loadError && !loading && (
        <Alert type="error">
          {loadError}
          <div className="alert__actions">
            <Button variant="secondary" onClick={reload}>
              Thử lại
            </Button>
          </div>
        </Alert>
      )}

      {/* Đang tải: hiện khung xám "skeleton" thay cho nội dung để người dùng biết trang đang tải */}
      {!profile && loading && <div className="skeleton skeleton--page" aria-busy="true" aria-label="Đang tải hồ sơ" />}

      {profile && (
        <div className="profile-grid">
          {/* ===== Cột trái: thẻ tóm tắt ===== */}
          <aside className="account-card profile-summary">
            <AvatarUploader profile={profile} onUpdated={applyProfile} />
            <h2 className="profile-summary__name">{profile.fullName}</h2>
            <span className="profile-summary__role">{ROLE_LABELS[profile.role] ?? profile.role}</span>
            <p className="profile-summary__meta">
              Mã tài khoản <strong>{profile.id}</strong> · Tham gia {formatDate(profile.createdAt)}
            </p>

            {/* Điểm: CHỈ XEM, do hệ thống cộng/trừ (backend không cho người dùng sửa) */}
            <div className="profile-stats">
              {/* Cộng tác viên dùng điểm hiệu suất thay cho điểm uy tín */}
              {profile.role === 'CONTRIBUTOR' ? (
                <div className="profile-stat profile-stat--trust">
                  <Icon name="star" size={20} />
                  <strong>{profile.performanceScore ?? 0}</strong>
                  <span>Điểm hiệu suất</span>
                </div>
              ) : (
                <div className="profile-stat profile-stat--trust">
                  <Icon name="shield" size={20} />
                  <strong>{profile.reputationScore ?? 0}</strong>
                  <span>Điểm uy tín</span>
                </div>
              )}
              <div className="profile-stat profile-stat--reward">
                <Icon name="gift" size={20} />
                <strong>{profile.rewardPoints}</strong>
                <span>Điểm thưởng</span>
              </div>
            </div>

            <Button to="/account/change-password" variant="secondary" block>
              <Icon name="lock" size={16} />
              Đổi mật khẩu
            </Button>
          </aside>

          {/* ===== Cột phải: form thông tin + mục Cộng tác viên ===== */}
          <div className="profile-main">
            <section className="account-card">
              <header className="account-card__header">
                <h2>Thông tin cá nhân</h2>
                <p>Thông tin này giúp toà soạn liên hệ và xác minh khi xử lý tin bạn gửi.</p>
              </header>

              <Alert type="success">{notice}</Alert>

              {/* key={profile.id}: tạo lại form khi đổi sang người dùng khác (useForm chỉ đọc giá trị ban đầu 1 lần) */}
              <ProfileForm
                key={profile.id}
                profile={profile}
                onSaved={(updated) => applyProfile(updated, 'Đã lưu thông tin cá nhân.')}
                onEditEmail={() => setEmailDialogOpen(true)}
                onChange={() => setNotice('')}
              />
            </section>

            {/* Đăng ký / theo dõi đơn Cộng tác viên. profileKey đổi (vừa lưu CCCD, ngày sinh...) -> mục này tự kiểm tra lại điều kiện */}
            {CONTRIBUTOR_SECTION_ROLES.includes(profile.role) && (
              <ContributorSection
                profileKey={[profile.citizenId, profile.dateOfBirth, profile.address, profile.reputationScore].join('|')}
              />
            )}
          </div>
        </div>
      )}

      {profile && (
        <ChangeEmailDialog
          open={emailDialogOpen}
          currentEmail={profile.email}
          onClose={() => setEmailDialogOpen(false)}
          onChanged={(updated) => applyProfile(updated, 'Đổi email thành công! Lần sau hãy đăng nhập bằng email mới.')}
        />
      )}
    </AccountLayout>
  )
}

/**
 * Form sửa thông tin cá nhân (tách riêng để useForm nhận đúng giá trị ban đầu SAU khi hồ sơ tải xong).
 * Nút "Lưu" và "Huỷ" chỉ bật khi người dùng đã sửa gì đó (form.isDirty).
 */
function ProfileForm({ profile, onSaved, onEditEmail, onChange }) {
  const form = useForm(toFormValues(profile), validate)

  const onSubmit = form.handleSubmit(async (values) => {
    const response = await userService.updateProfile(toPayload(values))
    form.reset(toFormValues(response.data)) // Đặt mốc mới -> nút Lưu tắt lại
    onSaved(response.data)
  })

  /** Gắn thêm: hễ người dùng sửa ô nào thì ẩn thông báo "Đã lưu" cũ. */
  const field = (name) => {
    const props = form.field(name)
    return {
      ...props,
      onChange: (event) => {
        props.onChange(event)
        onChange()
      },
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <Alert type="error">{form.formError}</Alert>

      <TextField label="Họ và tên" icon="user" autoComplete="name" required {...field('fullName')} />

      {/* Email không sửa trực tiếp ở đây: đổi qua hộp thoại có xác nhận OTP */}
      <div className="field">
        <span className="field__label">Email</span>
        <div className="readonly-field">
          <Icon name="mail" size={18} />
          <span className="readonly-field__value">{profile.email}</span>
          <button type="button" className="link-button" onClick={onEditEmail}>
            Thay đổi
          </button>
        </div>
      </div>

      <div className="form__row">
        <TextField
          label="Số điện thoại"
          icon="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          {...field('phone')}
        />
        <TextField
          label="Số căn cước công dân"
          icon="creditCard"
          inputMode="numeric"
          maxLength={CITIZEN_ID_LENGTH}
          placeholder={`${CITIZEN_ID_LENGTH} chữ số`}
          {...field('citizenId')}
        />
      </div>

      <div className="form__row">
        <TextField label="Ngày sinh" icon="calendar" type="date" max={todayIso()} {...field('dateOfBirth')} />
        <TextField
          label="Địa chỉ"
          icon="mapPin"
          placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
          autoComplete="street-address"
          {...field('address')}
        />
      </div>

      <div className="form__actions">
        <Button variant="secondary" onClick={() => form.reset()} disabled={!form.isDirty || form.submitting}>
          Huỷ thay đổi
        </Button>
        <Button type="submit" loading={form.submitting} disabled={!form.isDirty}>
          {form.submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  )
}

export default Profile
