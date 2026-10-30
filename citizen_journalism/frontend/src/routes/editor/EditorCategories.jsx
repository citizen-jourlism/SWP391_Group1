
import { useEffect, useState } from 'react'
import { categoryManageService } from '../../services/categoryManageService'
import '../../assets/styles/editor-categories.css'

// Dữ liệu minh họa trên trình duyệt, KHÔNG ghi vào MySQL.
const DEMO_CATEGORIES = [
  { id: 1, name: 'Thời sự', slug: 'thoi-su', deputyEicId: null, active: true },
  { id: 2, name: 'Giao thông', slug: 'giao-thong', deputyEicId: null, active: true },
  { id: 3, name: 'Đời sống', slug: 'doi-song', deputyEicId: null, active: true },
  { id: 4, name: 'Môi trường', slug: 'moi-truong', deputyEicId: null, active: true },
  { id: 5, name: 'Giáo dục', slug: 'giao-duc', deputyEicId: null, active: false },
  { id: 6, name: 'Y tế & sức khỏe', slug: 'y-te-suc-khoe', deputyEicId: null, active: true },
]

const EMPTY = {
  name: '',
  slug: '',
  deputyEicId: '',
  active: true,
}

export default function EditorCategories() {
  const [demo, setDemo] = useState(true)
  const [demoItems, setDemoItems] = useState(DEMO_CATEGORIES)
  const [realItems, setRealItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  const items = demo ? demoItems : realItems

  const activeCount = items.filter(item => item.active).length

  const visible = items.filter(item => {
    const matchesText = `${item.name} ${item.slug}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())

    const matchesStatus =
      status === 'all' ||
      (status === 'active' ? item.active : !item.active)

    return matchesText && matchesStatus
  })

  async function loadReal() {
    setLoading(true)
    setError('')

    try {
      const response = await categoryManageService.list()
      setRealItems(response.data || [])
    } catch (err) {
      setError(err.message || 'Không tải được danh sách chuyên mục.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!demo) loadReal()
  }, [demo])

  function switchMode(value) {
    setDemo(value)
    setSearch('')
    setStatus('all')
    setError('')
    setMessage('')
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  function openEdit(item) {
    setEditingId(item.id)

    setForm({
      name: item.name,
      slug: item.slug,
      deputyEicId: item.deputyEicId || '',
      active: item.active,
    })

    setShowForm(true)
    setError('')
    setMessage('')
  }

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

    if (
      !payload.name ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)
    ) {
      setError('Hãy nhập tên và slug hợp lệ (chữ thường, số, dấu -).')
      return
    }

    if (
      items.some(
        item =>
          item.slug.toLowerCase() === payload.slug &&
          item.id !== editingId
      )
    ) {
      setError('Slug đã tồn tại trong danh sách hiện tại.')
      return
    }

    setBusy(true)

    try {
      if (demo) {
        if (editingId !== null) {
          setDemoItems(old =>
            old.map(item =>
              item.id === editingId
                ? { ...item, ...payload }
                : item
            )
          )
        } else {
          setDemoItems(old => [
            ...old,
            {
              ...payload,
              id: Math.max(0, ...old.map(item => item.id)) + 1,
            },
          ])
        }
      } else {
        if (editingId !== null) {
          await categoryManageService.update(editingId, payload)
        } else {
          await categoryManageService.create(payload)
        }

        await loadReal()
      }

      setMessage(
        demo
          ? 'Đã cập nhật dữ liệu minh họa (không lưu Database).'
          : 'Đã lưu chuyên mục vào hệ thống.'
      )

      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message || 'Không thể lưu chuyên mục.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(item) {
    setError('')
    setMessage('')
    setBusy(true)

    try {
      if (demo) {
        setDemoItems(old =>
          old.map(row =>
            row.id === item.id
              ? { ...row, active: !row.active }
              : row
          )
        )
      } else {
        await categoryManageService.setActive(
          item.id,
          !item.active
        )

        await loadReal()
      }

      setMessage(
        demo
          ? 'Đã đổi trạng thái bản demo.'
          : 'Đã cập nhật trạng thái chuyên mục.'
      )
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="category-page">
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

      {/* Chọn nguồn dữ liệu */}
      <div
        className="category-mode"
        role="group"
        aria-label="Nguồn dữ liệu"
      >
        <div>
          <strong>Nguồn dữ liệu</strong>

          <span>
            {demo
              ? 'Đang xem ví dụ để thử giao diện. Không ghi vào cơ sở dữ liệu.'
              : 'Đang dùng dữ liệu thật từ API Editor.'}
          </span>
        </div>

        <div className="category-mode__switch">
          <button
            type="button"
            className={demo ? 'selected' : ''}
            onClick={() => switchMode(true)}
          >
            Xem demo
          </button>

          <button
            type="button"
            className={!demo ? 'selected' : ''}
            onClick={() => switchMode(false)}
          >
            Dữ liệu thật
          </button>
        </div>
      </div>

      {/* Thống kê chuyên mục */}
      <div className="category-stats">
        <article>
          <span>Tổng chuyên mục</span>
          <strong>{items.length}</strong>
          <small>Các chuyên mục đang quản lý</small>
        </article>

        <article>
          <span>Đang hoạt động</span>
          <strong className="category-stats__green">
            {activeCount}
          </strong>
          <small>Được bật trong hệ thống</small>
        </article>

        <article>
          <span>Tạm tắt</span>
          <strong className="category-stats__orange">
            {items.length - activeCount}
          </strong>
          <small>Chuyên mục chưa hoạt động</small>
        </article>
      </div>

      {error && (
        <div
          className="category-notice category-notice--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="category-notice category-notice--ok"
          role="status"
        >
          {message}
        </div>
      )}

      {/* Form thêm / chỉnh sửa */}
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
              onClick={() => setShowForm(false)}
            >
              Đóng ✕
            </button>
          </div>

          <form onSubmit={save}>
            <div className="category-form__grid">
              <label>
                Tên chuyên mục <span>*</span>
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={e =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Ví dụ: Giao thông"
                />
              </label>

              <label>
                Slug <span>*</span>
                <input
                  required
                  maxLength={100}
                  value={form.slug}
                  onChange={e =>
                    setForm({ ...form, slug: e.target.value })
                  }
                  placeholder="giao-thong"
                />
              </label>

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
                  onClick={() => setShowForm(false)}
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
            <p>{visible.length} kết quả phù hợp</p>
          </div>

          {demo && (
            <span className="category-demo-badge">
              DỮ LIỆU MINH HỌA
            </span>
          )}
        </div>

        {/* Bộ lọc */}
        <div className="category-filters">
          <input
            aria-label="Tìm chuyên mục"
            placeholder="Tìm theo tên hoặc slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm tắt</option>
          </select>

          {!demo && (
            <button
              type="button"
              className="category-btn category-btn--light"
              onClick={loadReal}
              disabled={loading}
            >
              Làm mới
            </button>
          )}
        </div>

        {/* Bảng dữ liệu */}
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
              {loading && !demo ? (
                <tr>
                  <td colSpan={6}>
                    Đang tải chuyên mục...
                  </td>
                </tr>
              ) : (
                visible.map(item => (
                  <tr key={item.id}>
                    <td className="category-table__id">
                      #{item.id}
                    </td>

                    <td>
                      <strong>{item.name}</strong>
                    </td>

                    <td>
                      <code>{item.slug}</code>
                    </td>

                    <td>
                      {item.deputyEicId || (
                        <span className="category-muted">
                          Chưa phân công
                        </span>
                      )}
                    </td>

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
