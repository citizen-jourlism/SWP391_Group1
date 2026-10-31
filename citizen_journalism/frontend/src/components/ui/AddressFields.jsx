import SelectField from './SelectField'
import TextField from './TextField'
import { useLocationOptions } from '../../hooks/useLocationOptions'

/**
 * Bộ ô ĐỊA CHỈ dùng chung: chọn Tỉnh/Thành phố, chọn Phường/Xã, rồi ghi số nhà, ngõ, đường.
 * Dùng ở: routes/Profile.jsx (người dùng tự sửa), routes/admin/AdminUserDetail.jsx (admin sửa).
 *
 * Form cha cần có 3 ô: province, ward, address.
 * Đổi tỉnh thì xoá phường/xã đã chọn, vì mỗi tỉnh có danh sách phường/xã riêng.
 *
 * Props:
 *   - form  : kết quả của useForm
 *   - field : hàm lấy props cho từng ô, mặc định form.field (trang Hồ sơ truyền hàm riêng để ẩn thông báo "Đã lưu")
 */
function AddressFields({ form, field = form.field }) {
  const { provinceOptions, wardOptions } = useLocationOptions(form.values.province)
  const provinceProps = field('province')

  return (
    <>
      <div className="form__row">
        <SelectField
          label="Tỉnh/Thành phố"
          options={provinceOptions}
          placeholder="Chọn tỉnh/thành phố"
          {...provinceProps}
          onChange={(event) => {
            provinceProps.onChange(event)
            form.setValue('ward', '')
          }}
        />
        <SelectField
          label="Phường/Xã"
          options={wardOptions}
          placeholder={form.values.province ? 'Chọn phường/xã' : 'Chọn tỉnh/thành phố trước'}
          disabled={!form.values.province}
          {...field('ward')}
        />
      </div>
      <TextField
        label="Địa chỉ"
        icon="mapPin"
        placeholder="Số nhà, ngõ, đường"
        autoComplete="street-address"
        {...field('address')}
      />
    </>
  )
}

export default AddressFields
