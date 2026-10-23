import { useEffect, useRef, useState } from 'react'

/**
 * Custom hook TẢI DỮ LIỆU TỪ API cho một trang / một khối, dùng lại ở nhiều nơi
 * (bàn Biên tập viên, mục Cộng tác viên trong Hồ sơ...).
 *
 * CÁCH DÙNG:
 *   const { data, error, loading, reload, setData } = useAsyncData(() => editorService.listApplications({ status, page }), `${status}|${page}`)
 *
 * @param load hàm gọi API, trả về Promise<{ data }> (dạng của lib/api.js)
 * @param key  chuỗi đại diện cho "điều kiện tải". key đổi (đổi trang, đổi bộ lọc...) -> tự tải lại.
 *
 * Trả về:
 *   - data    : dữ liệu (GIỮ dữ liệu cũ trong lúc tải key mới -> trang chỉ làm mờ, không bị trắng xoá giật cục)
 *   - error   : thông báo lỗi ('' nếu không lỗi)
 *   - loading : true khi dữ liệu đang hiển thị KHÔNG thuộc key hiện tại (đang tải)
 *   - reload  : gọi để tải lại với cùng key (ví dụ nút "Làm mới", sau khi xét duyệt xong)
 *   - setData : thay dữ liệu bằng kết quả mới mà không cần gọi lại API (ví dụ API xét duyệt trả về đơn đã cập nhật)
 *
 * CHỐNG LẪN KẾT QUẢ: người dùng đổi trang liên tục thì request cũ có thể về SAU request mới;
 * biến `cancelled` bỏ qua kết quả của request đã lỗi thời.
 */
export function useAsyncData(load, key) {
  const [reloadToken, setReloadToken] = useState(0)
  const fullKey = `${key}#${reloadToken}`
  const [result, setResult] = useState({ key: null, data: null, error: '' })

  // Luôn giữ hàm load MỚI NHẤT trong ref, để effect dưới chỉ phụ thuộc vào key (không gọi lại mỗi lần vẽ trang).
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let cancelled = false
    loadRef.current()
      .then((response) => !cancelled && setResult({ key: fullKey, data: response.data, error: '' }))
      .catch((error) => !cancelled && setResult((prev) => ({ key: fullKey, data: prev.data, error: error.message })))
    return () => {
      cancelled = true
    }
  }, [fullKey])

  return {
    data: result.data,
    error: result.error,
    loading: result.key !== fullKey,
    reload: () => setReloadToken((value) => value + 1),
    setData: (data) => setResult((prev) => ({ ...prev, data })),
  }
}
