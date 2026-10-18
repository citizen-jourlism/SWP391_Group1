/**
 * Logo "Tin Nóng Dân Sinh": tia sét + sóng phát tin trên nền gradient cam sang đen.
 *
 * File ảnh gốc nằm ở public/logo.svg. Vite phục vụ thư mục public/ ở đường dẫn gốc "/",
 * nên ảnh có địa chỉ là "/logo.svg". Cùng file này cũng được dùng làm favicon (xem index.html).
 *
 * TẠI SAO tạo component riêng? Logo xuất hiện ở nhiều chỗ (trang chủ, các trang tài khoản, sau này
 * là trang admin...). Đổi logo chỉ cần thay file public/logo.svg; đổi cách hiển thị thì sửa ở đây.
 *
 * alt="": logo luôn đứng cạnh chữ "TIN NÓNG DÂN SINH", nên trình đọc màn hình không cần đọc thêm.
 * CSS class .logo khai báo trong src/index.css (dùng được ở mọi trang).
 *
 * CÁCH DÙNG: <Logo size={42} />
 */
function Logo({ size = 42, className = '' }) {
  return <img src="/logo.svg" width={size} height={size} alt="" className={`logo ${className}`} />
}

export default Logo
