import { useAsyncData } from './useAsyncData'
import { locationService } from '../services/locationService'

/** Đổi danh sách tên thành option của SelectField. */
const toOptions = (names) => (names ?? []).map((name) => ({ value: name, label: name }))

/**
 * Tải danh sách tỉnh + phường/xã cho các ô chọn địa chỉ.
 * Dùng ở: components/ui/AddressFields.jsx (Hồ sơ, sửa tài khoản), routes/editor/EditorAssignContributor.jsx (bộ lọc).
 *
 * @param province tỉnh đang chọn; đổi tỉnh thì tự tải lại phường/xã. Chưa chọn tỉnh thì danh sách phường/xã rỗng.
 * Trong lúc tải phường/xã của tỉnh mới, trả về danh sách rỗng để không chọn nhầm phường/xã của tỉnh cũ.
 */
export function useLocationOptions(province) {
  const { data: provinces } = useAsyncData(() => locationService.provinces(), 'provinces')
  const { data: wards, loading } = useAsyncData(
    () => (province ? locationService.wards(province) : Promise.resolve({ data: [] })),
    province,
  )
  return { provinceOptions: toOptions(provinces), wardOptions: loading ? [] : toOptions(wards) }
}
