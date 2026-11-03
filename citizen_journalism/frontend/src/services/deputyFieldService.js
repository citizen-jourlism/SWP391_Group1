import api from '../lib/api'

/**
 * LĨNH VỰC PHỤ TRÁCH của Phó Tổng biên tập (backend: DeputyFieldController -> DeputyFieldService).
 * Dùng ở CreateUserDialog.jsx: chọn vai trò Phó TBT thì tải danh sách này để admin chọn 1 hoặc nhiều lĩnh vực.
 * Các id đã chọn gửi kèm adminService.createUser dưới tên categoryIds.
 */
export const deputyFieldService = {
  // [{ id, name, deputyId, deputyName }] — chuyên mục đang bật trong DB, kèm Phó TBT đang phụ trách (nếu có)
  list: () => api.get('/admin/deputy-fields'),
}
