import Icon from './Icon'

/**
 * Thanh phân trang: "Hiển thị 11–20 / 37" + nút Trang trước / Trang sau.
 * Nhận đúng dữ liệu PageResponse từ backend: { page (bắt đầu từ 0), size, totalItems, totalPages }.
 * onChange(trangMới) do trang cha xử lý (gọi lại API với trang mới).
 */
function Pagination({ page, size, totalItems, totalPages, onChange }) {
  if (totalItems === 0) return null
  const from = page * size + 1
  const to = Math.min((page + 1) * size, totalItems)

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination__info">
        Hiển thị <strong>{from}–{to}</strong> / {totalItems}
      </span>
      <div className="pagination__buttons">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Trang trước">
          <Icon name="arrowLeft" size={16} />
        </button>
        <span>
          Trang {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page + 1 >= totalPages}
          aria-label="Trang sau"
          className="pagination__next"
        >
          <Icon name="arrowLeft" size={16} />
        </button>
      </div>
    </nav>
  )
}

export default Pagination
