import { useAsyncData } from '../../hooks/useAsyncData'
import { deputyFieldService } from '../../services/deputyFieldService'
import Alert from '../ui/Alert'
import ChipSelect from '../ui/ChipSelect'

/*
 * Ô chọn LĨNH VỰC PHỤ TRÁCH của Phó Tổng biên tập (chỉ hiện khi vai trò là Phó TBT).
 * Luồng: deputyFieldService.list -> GET /api/admin/deputy-fields -> DeputyFieldService.listActive
 *        (các chuyên mục đang bật trong bảng categories). Id đã chọn gửi kèm khi lưu tài khoản (categoryIds).
 *   - DeputyFieldPicker (mặc định): tự tải danh sách, dùng ở CreateUserDialog (tạo tài khoản).
 *   - DeputyFieldChips: nhận danh sách có sẵn, dùng ở AdminUserDetail (trang đã tải danh sách để biết lĩnh vực hiện tại).
 *
 * 1 Phó TBT chọn được nhiều lĩnh vực; mỗi lĩnh vực chỉ 1 người phụ trách, nên lĩnh vực đang của NGƯỜI KHÁC mà vẫn chọn
 * thì sẽ chuyển sang tài khoản này -> hiện cảnh báo nêu rõ lĩnh vực nào đang do ai phụ trách.
 */

/** Tự tải danh sách lĩnh vực. Props: value (mảng id chuyên mục), onChange(mảngId), error. */
function DeputyFieldPicker(props) {
  const { data: fields, error: loadError } = useAsyncData(() => deputyFieldService.list(), 'deputy-fields')

  if (loadError) return <Alert type="error">{loadError}</Alert>
  if (!fields) return <div className="skeleton" style={{ height: 64 }} />
  return <DeputyFieldChips fields={fields} {...props} />
}

/**
 * @param fields   [{ id, name, deputyId, deputyName }] từ GET /api/admin/deputy-fields
 * @param ownerId  mã tài khoản đang sửa (lĩnh vực của chính người này không cần cảnh báo); tạo mới thì bỏ trống
 */
export function DeputyFieldChips({ fields, ownerId, value, onChange, error }) {
  if (fields.length === 0) {
    return <Alert type="warning">Chưa có lĩnh vực (chuyên mục) nào đang hoạt động. Hãy tạo chuyên mục trước.</Alert>
  }

  // ChipSelect làm việc với chuỗi (tên lĩnh vực) -> đổi qua lại giữa tên và id
  const selected = fields.filter((field) => value.includes(field.id))
  const taken = selected.filter((field) => field.deputyId && field.deputyId !== ownerId)

  return (
    <>
      <ChipSelect
        label="Lĩnh vực phụ trách"
        required
        options={fields.map((field) => field.name)}
        value={selected.map((field) => field.name)}
        onChange={(names) => onChange(fields.filter((field) => names.includes(field.name)).map((field) => field.id))}
        hint="Chọn 1 hoặc nhiều lĩnh vực. Bài nghiên cứu của Chuyên gia chỉ được gửi tới Phó TBT phụ trách đúng lĩnh vực."
        error={error}
      />
      {taken.length > 0 && (
        <Alert type="warning">
          Đang có người phụ trách:{' '}
          {taken.map((field) => `${field.name} (${field.deputyName} - ${field.deputyId})`).join(', ')}. Lưu sẽ chuyển các
          lĩnh vực này sang tài khoản này.
        </Alert>
      )}
    </>
  )
}

export default DeputyFieldPicker
