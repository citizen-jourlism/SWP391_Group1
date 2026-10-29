import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateUserDialog from '../../components/admin/CreateUserDialog'
import UserCell from '../../components/admin/UserCell'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDate } from '../../lib/format'
import { ROLE_LABELS, ROLE_TONES, STATUS_INFO } from '../../lib/roles'
import { adminService } from '../../services/adminService'

/*
 * TRANG QUẢN LÝ TÀI KHOẢN — /admin/users (trang con trong AdminLayout, chỉ SYSTEM_ADMIN).
 * Dữ liệu: GET /api/admin/users?keyword=&role=&status=&page=&size= (AdminService.searchUsers).
 *
 * CHỨC NĂNG:
 *   - Tìm theo tên / email / mã / SĐT (chờ người dùng ngừng gõ mới tìm, xem useDebouncedValue)
 *   - Lọc theo vai trò, trạng thái; phân trang 10 dòng/trang
 *   - Tạo tài khoản nội bộ (CreateUserDialog), khoá / mở khoá (ConfirmDialog)
 *   - Nút sửa -> trang chi tiết /admin/users/:id (AdminUserDetail: xem đủ thông tin, sửa thông tin + vai trò)
 *   - Hàng của tài khoản quản trị bị khoá thao tác (hệ thống chỉ có 1 admin, không được tự khoá mình)
 *
 * CÁCH TẢI DỮ LIỆU: mọi điều kiện tìm kiếm gom vào `queryKey`. queryKey đổi -> useEffect gọi API.
 * `loading` = kết quả đang hiển thị thuộc về queryKey CŨ (vẫn giữ bảng cũ, chỉ làm mờ, để trang không bị giật).
 */

const PAGE_SIZE = 10
const ROLE_FILTERS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))
const STATUS_FILTERS = Object.entries(STATUS_INFO).map(([value, info]) => ({ value, label: info.label }))

function AdminUsers() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [reloadToken, setReloadToken] = useState(0) // Tăng lên để buộc tải lại (sau khi tạo / sửa tài khoản)
  const debouncedKeyword = useDebouncedValue(keyword.trim())

  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null) // Tài khoản đang khoá / mở khoá

  const queryKey = JSON.stringify({ keyword: debouncedKeyword, role, status, page, reloadToken })

  useEffect(() => {
    let cancelled = false // Bỏ qua kết quả của request cũ nếu người dùng đã đổi điều kiện trong lúc chờ
    const { reloadToken: _ignored, ...params } = JSON.parse(queryKey)
    adminService
      .searchUsers({ ...params, size: PAGE_SIZE })
      .then((response) => !cancelled && setResult({ key: queryKey, data: response.data, error: '' }))
      .catch((error) => !cancelled && setResult({ key: queryKey, data: null, error: error.message }))
    return () => {
      cancelled = true
    }
  }, [queryKey])

  const loading = result.key !== queryKey
  const data = result.data

  /** Đổi bộ lọc thì quay về trang đầu. */
  const changeFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  /** Sau mỗi thao tác thành công: hiện thông báo + tải lại bảng. */
  const afterChange = (message) => {
    setNotice(message)
    setReloadToken((value) => value + 1)
  }

  const toggleLock = async () => {
    const nextStatus = statusTarget.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED'
    const response = await adminService.updateStatus(statusTarget.id, nextStatus)
    afterChange(response.message)
  }

  return (
    <>
      <section className="admin-panel">
        {/* ----- Thanh công cụ: tìm kiếm, lọc, tạo mới ----- */}
        <div className="admin-toolbar">
          <label className="search-box">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(0)
              }}
              placeholder="Tìm theo tên, email, mã, số điện thoại..."
              aria-label="Tìm kiếm tài khoản"
            />
          </label>
          <SelectField options={ROLE_FILTERS} placeholder="Tất cả vai trò" value={role} onChange={changeFilter(setRole)} aria-label="Lọc theo vai trò" />
          <SelectField options={STATUS_FILTERS} placeholder="Tất cả trạng thái" value={status} onChange={changeFilter(setStatus)} aria-label="Lọc theo trạng thái" />
          <Button onClick={() => setCreating(true)} className="admin-toolbar__create">
            <Icon name="plus" size={16} />
            Tạo tài khoản
          </Button>
        </div>

        <Alert type="success">{notice}</Alert>
        <Alert type="error">{result.error}</Alert>

        {/* ----- Bảng tài khoản (cuộn ngang trên màn hình hẹp) ----- */}
        <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Mã</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th className="data-table__actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!data && loading &&
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={7}>
                      <div className="skeleton skeleton--row" />
                    </td>
                  </tr>
                ))}

              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="data-table__empty">
                    <Icon name="search" size={28} />
                    Không tìm thấy tài khoản phù hợp.
                  </td>
                </tr>
              )}

              {data?.items.map((user) => {
                const isAdmin = user.role === 'SYSTEM_ADMIN'
                const statusInfo = STATUS_INFO[user.status]
                return (
                  <tr key={user.id}>
                    <td>
                      <UserCell user={user} sub={user.username ? `${user.email} · @${user.username}` : user.email} />
                    </td>
                    <td className="data-table__mono">{user.id}</td>
                    <td>{user.phone}</td>
                    <td>
                      <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td>
                      <Badge tone={statusInfo?.tone}>{statusInfo?.label ?? user.status}</Badge>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td className="data-table__actions">
                      {isAdmin ? (
                        <span className="data-table__note">Tài khoản quản trị</span>
                      ) : (
                        // Nút dạng icon cho gọn bảng; title = chú thích hiện khi rê chuột, aria-label = tên cho trình đọc màn hình
                        <div className="row-actions">
                          <button type="button" title="Xem / sửa tài khoản" aria-label={`Xem / sửa ${user.fullName}`} onClick={() => navigate(`/admin/users/${user.id}`)}>
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            className={user.status === 'LOCKED' ? 'is-positive' : 'is-danger'}
                            title={user.status === 'LOCKED' ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
                            aria-label={`${user.status === 'LOCKED' ? 'Mở khoá' : 'Khoá'} ${user.fullName}`}
                            onClick={() => setStatusTarget(user)}
                          >
                            <Icon name="lock" size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data && <Pagination {...data} onChange={setPage} />}
      </section>

      {/* ----- Các hộp thoại ----- */}
      <CreateUserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(user) => afterChange(`Đã tạo tài khoản ${user.id} - ${user.fullName}.`)}
      />
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.status === 'LOCKED' ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
        message={
          statusTarget?.status === 'LOCKED'
            ? `Mở khoá cho ${statusTarget?.fullName} (${statusTarget?.id})? Người này sẽ đăng nhập lại được.`
            : `Khoá ${statusTarget?.fullName} (${statusTarget?.id})? Người này sẽ bị đăng xuất và không thể đăng nhập cho tới khi được mở khoá.`
        }
        confirmLabel={statusTarget?.status === 'LOCKED' ? 'Mở khoá' : 'Khoá tài khoản'}
        danger={statusTarget?.status !== 'LOCKED'}
        onConfirm={toggleLock}
        onClose={() => setStatusTarget(null)}
      />
    </>
  )
}

export default AdminUsers
