
import { useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData'
import { expertUpgradeService } from '../../services/expertUpgradeService'
import '../../assets/styles/expert-review-queue.css'

// TungTT - Iteration 3 - Task 3
// Màn hình xét duyệt Expert dành cho Editor và Deputy EIC.

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN')
}

function SummaryCard({ icon, title, value, color }) {
  return (
    <div className="erq-stat">
      <div className={`erq-stat__icon erq-stat__icon--${color}`}>
        {icon}
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function InfoField({ label, value }) {
  return (
    <div className="erq-info">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

export default function ExpertReviewQueue({ mode }) {
  const isEditor = mode === 'editor'
  const [notes, setNotes] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [downloadKey, setDownloadKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [keyword, setKeyword] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useAsyncData(
    () => isEditor
      ? expertUpgradeService.editorQueue()
      : expertUpgradeService.deputyQueue(),
    `expert-review-${mode}`
  )

  const applications = Array.isArray(data) ? data : []

  // Tìm kiếm trong danh sách đơn trả về từ Backend.
  const filtered = applications.filter(item => {
    const text = [
      item.fullName,
      item.email,
      item.expertise,
      item.qualification,
    ].join(' ').toLowerCase()

    return text.includes(keyword.trim().toLowerCase())
  })

  const downloadFile = async (item, index) => {
    const doc = item.documents?.[index]
    if (!doc) return

    const key = `${item.id}-${index}`

    try {
      setError('')
      setDownloadKey(key)

      await expertUpgradeService.downloadDocument(
        item.id,
        index,
        doc.name
      )
    } catch (err) {
      setError(err?.message || 'Không tải được tài liệu.')
    } finally {
      setDownloadKey('')
    }
  }

  const review = async (id, approved) => {
    const note = (notes[id] || '').trim()

    if (!approved && !note) {
      setError('Vui lòng nhập lý do từ chối hồ sơ.')
      return
    }

    const message = approved
      ? isEditor
        ? 'Xác nhận chuyển hồ sơ đến Phó Tổng Biên tập?'
        : 'Xác nhận nâng cấp tài khoản này thành Expert?'
      : 'Xác nhận từ chối đơn Expert này?'

    if (!window.confirm(message)) return

    try {
      setBusyId(id)
      setError('')
      setNotice('')

      if (isEditor) {
        await expertUpgradeService.editorReview(id, approved, note)
      } else {
        await expertUpgradeService.deputyReview(id, approved, note)
      }

      setNotice(
        approved
          ? isEditor
            ? 'Đã chuyển hồ sơ đến Phó Tổng Biên tập.'
            : 'Đã phê duyệt nâng cấp Expert.'
          : 'Đã từ chối hồ sơ Expert.'
      )

      setNotes(current => ({ ...current, [id]: '' }))
      setExpandedId(null)
      await reload()
    } catch (err) {
      setError(err?.message || 'Không xử lý được hồ sơ.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="erq-page">

      {/* TIÊU ĐỀ */}
      <header className="erq-hero">
        <div className="erq-hero__content">
          <span className="erq-eyebrow">
            EDITORIAL APPROVAL SYSTEM
          </span>

          <h1>Duyệt hồ sơ Chuyên gia</h1>

          <p>
            {isEditor
              ? 'Kiểm tra năng lực chuyên môn, bằng cấp và chuyển tiếp hồ sơ hợp lệ.'
              : 'Đánh giá hồ sơ và quyết định nâng cấp tài khoản thành Chuyên gia.'}
          </p>

          <span className="erq-hero__role">
            {isEditor
              ? 'Biên tập viên · Xét duyệt bước 1'
              : 'Phó Tổng Biên tập · Xét duyệt cuối'}
          </span>
        </div>

        <div className="erq-hero__art" aria-hidden="true">
          <span>EXP</span>
        </div>
      </header>

      {/* THỐNG KÊ */}
      <div className="erq-stats">
        <SummaryCard
          icon="◷"
          title="Hồ sơ đang chờ"
          value={loading ? '…' : applications.length}
          color="blue"
        />

        <SummaryCard
          icon="▣"
          title="Kết quả tìm kiếm"
          value={loading ? '…' : filtered.length}
          color="purple"
        />

        <SummaryCard
          icon="✓"
          title="Bước xét duyệt"
          value={isEditor ? '01 / 02' : '02 / 02'}
          color="green"
        />
      </div>

      {/* THÔNG BÁO */}
      {error && (
        <div className="erq-alert erq-alert--error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      {loadError && (
        <div className="erq-alert erq-alert--error" role="alert">
          {loadError}
        </div>
      )}

      {notice && (
        <div className="erq-alert erq-alert--success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}

      {/* DANH SÁCH HỒ SƠ */}
      <section className="erq-panel">
        <div className="erq-panel__header">
          <div>
            <h2>Danh sách hồ sơ</h2>
            <p>Kiểm tra thông tin và tài liệu trước khi xét duyệt.</p>
          </div>

          <button
            type="button"
            className="erq-btn erq-btn--light"
            onClick={reload}
            disabled={loading || busyId !== null}
          >
            ↻ Làm mới
          </button>
        </div>

        <div className="erq-toolbar">
          <div className="erq-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, email hoặc lĩnh vực..."
              aria-label="Tìm kiếm hồ sơ Expert"
            />
          </div>

          <span className="erq-count">
            {filtered.length} hồ sơ
          </span>
        </div>

        {loading && (
          <div className="erq-empty">
            <div className="erq-empty__icon">◷</div>
            <h3>Đang tải hồ sơ...</h3>
            <p>Đang lấy danh sách xét duyệt.</p>
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <div className="erq-empty">
            <div className="erq-empty__icon">▤</div>
            <h3>
              {keyword
                ? 'Không tìm thấy hồ sơ phù hợp'
                : 'Chưa có hồ sơ chờ duyệt'}
            </h3>
            <p>
              {keyword
                ? 'Hãy thử thay đổi từ khóa tìm kiếm.'
                : 'Các đơn đăng ký mới sẽ xuất hiện tại đây.'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="erq-list">
            {filtered.map(item => {
              const expanded = expandedId === item.id
              const documents = item.documents ?? []

              return (
                <article className="erq-application" key={item.id}>

                  {/* Thông tin tổng quan */}
                  <div className="erq-application__top">
                    <div className="erq-person">
                      <div className="erq-avatar">
                        {(item.fullName || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <h3>{item.fullName || 'Chưa có tên'}</h3>
                        <p>{item.email || '—'}</p>
                        <small>Mã đơn: {item.id}</small>
                      </div>
                    </div>

                    <span className="erq-status">
                      <span className="erq-status__dot" />
                      {isEditor
                        ? 'Chờ Editor'
                        : 'Chờ duyệt cuối'}
                    </span>
                  </div>

                  {/* Thông tin chính */}
                  <div className="erq-info-grid">
                    <InfoField
                      label="Lĩnh vực chuyên môn"
                      value={item.expertise}
                    />

                    <InfoField
                      label="Trình độ / Bằng cấp"
                      value={item.qualification}
                    />

                    <InfoField
                      label="Ngày gửi hồ sơ"
                      value={formatDate(item.createdAt)}
                    />

                    <InfoField
                      label="Tài liệu đính kèm"
                      value={`${documents.length} tài liệu`}
                    />
                  </div>

                  {/* Mở rộng chi tiết */}
                  <button
                    type="button"
                    className="erq-toggle"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedId(expanded ? null : item.id)
                    }
                  >
                    {expanded
                      ? 'Thu gọn hồ sơ'
                      : 'Xem hồ sơ và xét duyệt'}
                    <span>{expanded ? '⌃' : '⌄'}</span>
                  </button>

                  {expanded && (
                    <div className="erq-expanded">

                      {/* Kinh nghiệm */}
                      <section className="erq-section">
                        <div className="erq-section__heading">
                          <span className="erq-section__icon">01</span>
                          <div>
                            <h4>Thông tin chuyên môn</h4>
                            <p>Kinh nghiệm do người đăng ký cung cấp</p>
                          </div>
                        </div>

                        <p className="erq-experience">
                          {item.experience || 'Chưa cung cấp kinh nghiệm chuyên môn.'}
                        </p>
                      </section>

                      {/* Bằng cấp và chứng chỉ */}
                      <section className="erq-section">
                        <div className="erq-section__heading">
                          <span className="erq-section__icon">02</span>
                          <div>
                            <h4>Bằng cấp & chứng chỉ</h4>
                            <p>Tài liệu minh chứng đã được tải lên</p>
                          </div>
                        </div>

                        {documents.length === 0 ? (
                          <p className="erq-muted">
                            Không có tài liệu đính kèm.
                          </p>
                        ) : (
                          <div className="erq-documents">
                            {documents.map((doc, index) => {
                              const key = `${item.id}-${index}`

                              return (
                                <div
                                  className="erq-document"
                                  key={key}
                                >
                                  <span className="erq-document__icon">
                                    {doc.contentType?.startsWith('image/')
                                      ? 'IMG'
                                      : 'DOC'}
                                  </span>

                                  <div className="erq-document__info">
                                    <strong>{doc.name}</strong>
                                    <small>
                                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                                    </small>
                                  </div>

                                  <button
                                    type="button"
                                    className="erq-btn erq-btn--download"
                                    disabled={downloadKey === key}
                                    onClick={() =>
                                      downloadFile(item, index)
                                    }
                                  >
                                    {downloadKey === key
                                      ? 'Đang tải...'
                                      : '↓ Tải xuống'}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </section>

                      {/* Nhận xét Editor */}
                      {!isEditor && item.editorNote && (
                        <section className="erq-section">
                          <div className="erq-section__heading">
                            <span className="erq-section__icon">03</span>
                            <div>
                              <h4>Đánh giá từ Editor</h4>
                              <p>Nhận xét ở bước xét duyệt đầu tiên</p>
                            </div>
                          </div>

                          <div className="erq-editor-note">
                            {item.editorNote}
                          </div>
                        </section>
                      )}

                      {/* Xét duyệt */}
                      <section className="erq-review">
                        <h4>Quyết định xét duyệt</h4>
                        <p>
                          {isEditor
                            ? 'Đơn hợp lệ sẽ được chuyển đến Phó Tổng Biên tập.'
                            : 'Phê duyệt sẽ nâng cấp tài khoản từ Citizen thành Expert.'}
                        </p>

                        <label className="erq-note">
                          <span>Nhận xét / Lý do từ chối</span>
                          <textarea
                            rows={4}
                            maxLength={1000}
                            value={notes[item.id] || ''}
                            onChange={e =>
                              setNotes(current => ({
                                ...current,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Nhập đánh giá hồ sơ; bắt buộc nếu từ chối..."
                          />
                          <small>
                            Bắt buộc nhập lý do khi từ chối hồ sơ.
                          </small>
                        </label>

                        <div className="erq-actions">
                          <button
                            type="button"
                            className="erq-btn erq-btn--reject"
                            disabled={busyId !== null}
                            onClick={() => review(item.id, false)}
                          >
                            Từ chối hồ sơ
                          </button>

                          <button
                            type="button"
                            className="erq-btn erq-btn--approve"
                            disabled={busyId !== null}
                            onClick={() => review(item.id, true)}
                          >
                            {busyId === item.id
                              ? 'Đang xử lý...'
                              : isEditor
                                ? '✓ Chuyển Phó Tổng Biên tập'
                                : '✓ Phê duyệt Expert'}
                          </button>
                        </div>
                      </section>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
