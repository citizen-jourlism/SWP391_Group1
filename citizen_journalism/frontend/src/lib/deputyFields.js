/**
 * Hàm phụ cho LĨNH VỰC PHỤ TRÁCH của Phó TBT (danh sách từ GET /api/admin/deputy-fields: [{ id, name, deputyId, deputyName }]).
 * Dùng ở routes/admin/AdminUserDetail.jsx (form sửa tài khoản).
 */

/** Id các lĩnh vực tài khoản userId đang phụ trách (giá trị ban đầu của form sửa). */
export const ownedFieldIds = (fields, userId) =>
  (fields ?? []).filter((field) => field.deputyId === userId).map((field) => field.id)
