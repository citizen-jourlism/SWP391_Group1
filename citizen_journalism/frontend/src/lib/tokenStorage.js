/**
 * Nơi DUY NHẤT đọc/ghi token đăng nhập (JWT) trong trình duyệt.
 *
 * - Có tick "Ghi nhớ đăng nhập": lưu ở localStorage -> đóng trình duyệt mở lại vẫn còn đăng nhập.
 * - Không tick: lưu ở sessionStorage -> đóng tab là tự đăng xuất (an toàn hơn khi dùng máy chung).
 *
 * Ai dùng: lib/api.js (gắn token vào request), context/AuthProvider.jsx (đăng nhập / đăng xuất).
 * try/catch: một số trình duyệt (ẩn danh, chặn cookie) không cho dùng storage -> coi như không có token.
 */
const KEY = 'accessToken'

export const tokenStorage = {
  /** Lấy token (ưu tiên localStorage, sau đó sessionStorage). Không có thì trả về null. */
  get() {
    try {
      return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
    } catch {
      return null
    }
  },

  /** Lưu token. remember = true -> localStorage, false -> sessionStorage. */
  set(token, remember) {
    this.clear() // Xoá token cũ ở cả 2 nơi trước, tránh còn sót 1 token cũ
    try {
      ;(remember ? localStorage : sessionStorage).setItem(KEY, token)
    } catch {
      // Trình duyệt chặn storage: vẫn đăng nhập được trong lần này, chỉ mất khi tải lại trang.
    }
  },

  /** Xoá token ở cả 2 nơi (đăng xuất). */
  clear() {
    try {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
    } catch {
      // bỏ qua
    }
  },
}
