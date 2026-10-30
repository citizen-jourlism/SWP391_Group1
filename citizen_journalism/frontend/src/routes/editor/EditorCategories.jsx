
import { useCallback, useEffect, useState } from 'react'
import { categoryManageService } from '../../services/categoryManageService'
import '../../assets/styles/editor-categories.css'

const EMPTY = {
  name: '',
  slug: '',
  deputyEicId: '',
  active: true,
}

export default function EditorCategories() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  // Lấy danh sách chuyên mục từ Database thông qua API
  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await categoryManageService.list()

      setItems(
        Array.isArray(response.data) ? response.data : []
      )
    } catch (err) {
      setError(
        err.message || 'Không tải được danh sách chuyên mục.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Tự động tải dữ liệu khi mở trang
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Thống kê
  const activeCount = items.filter(item => item.active).length

  // Tìm kiếm và lọc trạng thái
  const visible = items.filter(item => {
    const matchesText =
      `${item.name || ''} ${item.slug || ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())

    const matchesStatus =
      status === 'all' ||
      (status === 'active' ? item.active : !item.active)

    return matchesText && matchesStatus
  })

  // Mở form thêm chuyên mục
  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY })
    setShowForm(true)
    setError('')
    setMessage('')
  }

  // Mở form sửa chuyên mục
  function openEdit(item) {
    setEditingId(item.id)

    setForm({
      name: item.name || '',
      slug: item.slug || '',
      deputyEicId:
        item.deputyEicId == null
          ? ''
          : String(item.deputyEicId),
      active: Boolean(item.active),
    })

    setShowForm(true)
    setError('')
    setMessage('')
  }

  // Đóng form
  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY })
  }

  // Thêm hoặc cập nhật chuyên mục
  async function save(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      deputyEicId: form.deputyEicId.trim() || null,
      active: form.active,
    }

    // Kiểm tra tên và slug
    if (
      !payload.name ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)
    ) {
      setError(
        'Hãy nhập tên và slug hợp lệ (chữ thường, số, dấu -).'
      )
      return
    }

    // Kiểm tra slug trùng trong danh sách hiện tại
    const duplicated = items.some(
      item =>
        (item.slug || '').toLowerCase() === payload.slug &&
        item.id !== editingId
    )

    if (duplicated) {
      setError('Slug đã tồn tại trong danh sách hiện tại.')
      return
    }

    setBusy(true)

    try {
      if (editingId !== null) {
        // Gọi API sửa chuyên mục
        await categoryManageService.update(editingId, payload)
      } else {
        // Gọi API thêm chuyên mục
        await categoryManageService.create(payload)
      }

      // Tải lại danh sách từ Backend
      await loadCategories()

      setMessage(
        editingId !== null
          ? 'Đã cập nhật chuyên mục thành công.'
          : 'Đã thêm chuyên mục thành công.'
      )

      closeForm()
    } catch (err) {
      setError(
        err.message || 'Không thể lưu chuyên mục.'
      )
    } finally {
      setBusy(false)
    }
  }

  // Bật hoặc tạm tắt chuyên mục
  async function toggle(item) {
    setError('')
    setMessage('')
    setBusy(true)

    try {
      await categoryManageService.setActive(
        item.id,
        !item.active
      )

      await loadCategories()

      setMessage(
        item.active
          ? 'Đã tạm tắt chuyên mục.'
          : 'Đã kích hoạt chuyên mục.'
      )
    } catch (err) {
      setError(
        err.message ||
        'Không thể cập nhật trạng thái chuyên mục.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="category-page">

      {/* Tiêu đề */}
      <header className="category-page__heading">
        <div>
          <div className="category-page__eyebrow">
            BÀN BIÊN TẬP / QUẢN LÝ NỘI DUNG
          </div>

          <h1>Quản lý chuyên mục</h1>

          <p>
            Tổ chức các lĩnh vực nội dung, phân công phụ trách
            và quản lý trạng thái hiển thị.
          </p>
        </div>

        <button
          className="category-btn category-btn--primary"
          type="button"
          onClick={openCreate}
        >
          + Thêm chuyên mục
        </button>
      </header>

      {/* Thống kê chuyên mục */}
      <div className="category-stats">

        <article>
          <span>Tổng chuyên mục</span>

          <strong>{items.length}</strong>

          <small>
            Các chuyên mục đang quản lý
          </small>
        </article>

        <article>
          <span>Đang hoạt động</span>

          <strong className="category-stats__green">
            {activeCount}
          </strong>

          <small>
            Được bật trong hệ thống
          </small>
        </article>

        <article>
          <span>Tạm tắt</span>

          <strong className="category-stats__orange">
            {items.length - activeCount}
          </strong>

          <small>
            Chuyên mục chưa hoạt động
          </small>
        </article>

      </div>

      {/* Hiển thị lỗi */}
      {error && (
        <div
          className="category-notice category-notice--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Hiển thị thông báo thành công */}
      {message && (
        <div
          className="category-notice category-notice--ok"
          role="status"
        >
          {message}
        </div>
      )}

      {/* Form thêm / sửa chuyên mục */}
      {showForm && (
        <section className="category-panel category-form">

          <div className="category-panel__head">
            <h2>
              {editingId !== null
                ? 'Chỉnh sửa chuyên mục'
                : 'Tạo chuyên mục mới'}
            </h2>

            <button
              type="button"
              className="category-link"
              onClick={closeForm}
              disabled={busy}
            >
              Đóng ✕
            </button>
          </div>

          <form onSubmit={save}>
            <div className="category-form__grid">

              {/* Tên chuyên mục */}
              <label>
                Tên chuyên mục <span>*</span>

                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={e =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Nhập tên chuyên mục"
                />
              </label>

              {/* Slug */}
              <label>
                Slug <span>*</span>

                <input
                  required
                  maxLength={100}
                  value={form.slug}
                  onChange={e =>
                    setForm({
                      ...form,
                      slug: e.target.value,
                    })
                  }
                  placeholder="Nhập slug chuyên mục"
                />
              </label>

              {/* Phó Tổng biên tập */}
              <label>
                Mã Phó Tổng biên tập
                <small>(tùy chọn)</small>

                <input
                  value={form.deputyEicId}
                  onChange={e =>
                    setForm({
                      ...form,
                      deputyEicId: e.target.value,
                    })
                  }
                  placeholder="Để trống nếu chưa phân công"
                />
              </label>

            </div>

            <div className="category-form__footer">

              {/* Kích hoạt */}
              <label className="category-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e =>
                    setForm({
                      ...form,
                      active: e.target.checked,
                    })
                  }
                />

                Kích hoạt chuyên mục
              </label>

              <div>
                <button
                  type="button"
                  className="category-btn category-btn--light"
                  onClick={closeForm}
                  disabled={busy}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="category-btn category-btn--primary"
                  disabled={busy}
                >
                  {busy
                    ? 'Đang lưu...'
                    : editingId !== null
                      ? 'Lưu thay đổi'
                      : 'Tạo chuyên mục'}
                </button>
              </div>

            </div>
          </form>
        </section>
      )}

      {/* Danh sách chuyên mục */}
      <section className="category-panel">

        <div className="category-panel__head">
          <div>
            <h2>Danh sách chuyên mục</h2>

            <p>
              {visible.length} kết quả phù hợp
            </p>
          </div>
        </div>

        {/* Tìm kiếm và lọc */}
        <div className="category-filters">

          <input
            aria-label="Tìm chuyên mục"
            placeholder="Tìm theo tên hoặc slug..."
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
          />

          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={e =>
              setStatus(e.target.value)
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>

            <option value="active">
              Đang hoạt động
            </option>

            <option value="inactive">
              Tạm tắt
            </option>
          </select>

          {/* Tải lại dữ liệu thật */}
          <button
            type="button"
            className="category-btn category-btn--light"
            onClick={loadCategories}
            disabled={loading || busy}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>

        </div>

        {/* Bảng chuyên mục */}
        <div className="table-wrap">
          <table className="data-table category-table">

            <thead>
              <tr>
                <th>MÃ</th>
                <th>CHUYÊN MỤC</th>
                <th>SLUG</th>
                <th>PHÓ TỔNG BIÊN TẬP</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan={6} className="category-empty">
                    Đang tải chuyên mục...
                  </td>
                </tr>
              ) : (
                visible.map(item => (
                  <tr key={item.id}>

                    {/* Mã */}
                    <td className="category-table__id">
                      #{item.id}
                    </td>

                    {/* Tên */}
                    <td>
                      <strong>
                        {item.name}
                      </strong>
                    </td>

                    {/* Slug */}
                    <td>
                      <code>
                        {item.slug}
                      </code>
                    </td>

                    {/* Phó Tổng biên tập */}
                    <td>
                      {item.deputyEicId || (
                        <span className="category-muted">
                          Chưa phân công
                        </span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td>
                      <span
                        className={`category-status ${
                          item.active
                            ? 'category-status--active'
                            : 'category-status--off'
                        }`}
                      >
                        {item.active
                          ? '● Hoạt động'
                          : '● Tạm tắt'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td>
                      <div className="category-actions">

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openEdit(item)}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggle(item)}
                        >
                          {item.active
                            ? 'Tạm tắt'
                            : 'Bật lại'}
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}

              {/* Không có dữ liệu */}
              {!loading && visible.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="category-empty"
                  >
                    Không có chuyên mục phù hợp.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

      </section>
    </main>
  )
}
