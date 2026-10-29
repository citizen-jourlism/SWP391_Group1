import { useState } from 'react'
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../lib/roles'
import { adminService } from '../../services/adminService'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

/**
 * Hộp thoại ĐỔI VAI TRÒ một tài khoản: danh sách các vai trò dạng thẻ chọn (radio), mỗi thẻ có mô tả ngắn.
 * PATCH /api/admin/users/{id}/role. Không có lựa chọn "Quản trị hệ thống" (hệ thống chỉ 1 admin).
 *
 * Props: user (tài khoản đang sửa, null = đóng), onClose, onChanged(user cập nhật).
 * Trang cha nên đặt key={user?.id} để mỗi lần mở cho người khác thì hộp thoại tạo mới (chọn sẵn vai trò hiện tại).
 */
function ChangeRoleDialog({ user, onClose, onChanged }) {
  const [role, setRole] = useState(user?.role ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await adminService.updateRole(user.id, role)
      onChanged(response.data, response.message)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={Boolean(user)} title="Đổi vai trò" onClose={onClose}>
      {user && (
        <>
          <p className="modal__text">
            Tài khoản <strong>{user.fullName}</strong> ({user.id}). Người dùng cần đăng nhập lại để nhận quyền mới.
          </p>
          <Alert type="error">{error}</Alert>
          <div className="role-options" role="radiogroup" aria-label="Chọn vai trò">
            {ASSIGNABLE_ROLES.map((value) => (
              <label key={value} className={`role-option ${role === value ? 'is-selected' : ''}`}>
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} />
                <span>
                  <strong>
                    {ROLE_LABELS[value]}
                    {value === user.role && <em> · hiện tại</em>}
                  </strong>
                  <small>{ROLE_DESCRIPTIONS[value]}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="modal__actions">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Huỷ
            </Button>
            <Button loading={saving} disabled={role === user.role} onClick={save}>
              Lưu vai trò
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

export default ChangeRoleDialog
