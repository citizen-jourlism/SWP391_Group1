import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime } from '../../lib/format'
import { EDIT_STATUS, PRIORITY_INFO, reviewStatusInfo } from '../../lib/researchEditorial'
import { editorService } from '../../services/editorService'
import '../../assets/styles/admin.css' // Ô tìm kiếm .search-box (dùng chung với trang Quản lý tài khoản)
import '../../assets/styles/submit.css' // Màu icon bài nghiên cứu (.category-card__icon--research)
import '../../assets/styles/revision.css'

/*
 * BIÊN TẬP BÀI VIẾT — /editor/articles (Biên tập viên).
 * Danh sách bài nghiên cứu Chuyên gia đã nộp, kèm TÌNH TRẠNG BIÊN TẬP tính theo yêu cầu chỉnh sửa gần nhất:
 * chưa chỉnh sửa / chờ Chuyên gia phản hồi / đã chỉnh sửa / Chuyên gia từ chối; cột "Kết quả duyệt": chờ duyệt /
 * đã chuyển Phó TBT (kèm cấp độ Low / Medium / High) / đã từ chối.
 * Luồng: trang này -> editorService.listArticles -> GET /api/editor/articles?editStatus=&field=&q=&page=
 *        (ResearchEditorialController -> ResearchEditorialService.listArticles).
 *
 * Bộ lọc: tình trạng biên tập, lĩnh vực (danh sách chuyên mục toà soạn, cùng nguồn với hàng đợi tin bài),
 * tìm theo tiêu đề (chờ người dùng ngừng gõ mới tìm, xem useDebouncedValue).
 * Nút "Mở" -> /editor/queue/research/<id> (EditorResearchDetail), giống nút "Mở" ở hàng đợi tin bài:
 * ở đó có "Sửa bài", lịch sử chỉnh sửa và trao đổi với Chuyên gia.
 */

const PAGE_SIZE = 10
const STATUS_OPTIONS = Object.entries(EDIT_STATUS).map(([value, info]) => ({ value, label: info.label }))

function EditorArticles() {
  const [keyword, setKeyword] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [field, setField] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())

  // Danh sách lĩnh vực: chỉ tải 1 lần khi mở trang
  const { data: fields } = useAsyncData(() => editorService.listQueueFields(), 'queue-fields')
  const fieldOptions = (fields ?? []).map((name) => ({ value: name, label: name }))
  const { data, error, loading } = useAsyncData(
    () => editorService.listArticles({ editStatus, field, q: debouncedKeyword, page, size: PAGE_SIZE }),
    `${editStatus}|${field}|${debouncedKeyword}|${page}`,
  )

  /** Đổi bộ lọc thì quay về trang đầu. */
  const changeFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  return (
    <section className="admin-panel">
      <div className="articles-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={keyword}
            onChange={changeFilter(setKeyword)}
            placeholder="Tìm theo tiêu đề bài..."
            aria-label="Tìm theo tiêu đề bài"
          />
        </label>
        <SelectField options={STATUS_OPTIONS} placeholder="Tất cả tình trạng" value={editStatus} onChange={changeFilter(setEditStatus)} aria-label="Lọc theo tình trạng biên tập" />
        <SelectField options={fieldOptions} placeholder="Tất cả lĩnh vực" value={field} onChange={changeFilter(setField)} aria-label="Lọc theo lĩnh vực" />
        {data && <span className="desk-toolbar__count">{data.totalItems} bài</span>}
      </div>

      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Bài viết</th>
              <th>Lĩnh vực</th>
              <th>Tác giả</th>
              <th>Nộp lúc</th>
              <th>Số lần sửa</th>
              <th>Tình trạng biên tập</th>
              <th>Kết quả duyệt</th>
              <th>Cập nhật gần nhất</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={9}>
                    <div className="skeleton skeleton--row" />
                  </td>
                </tr>
              ))}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={9} className="data-table__empty">
                  <Icon name="checkCircle" size={28} />
                  Không có bài viết nào phù hợp.
                </td>
              </tr>
            )}

            {data?.items.map((item) => {
              const status = EDIT_STATUS[item.editStatus]
              return (
                <tr key={item.id}>
                  <td>
                    <div className="desk-cell">
                      <span className="category-card__icon category-card__icon--research">
                        <Icon name="edit" size={16} />
                      </span>
                      <span>
                        <strong>{item.title || '(Chưa có tiêu đề)'}</strong>
                        <small className="data-table__mono">{item.code}</small>
                      </span>
                    </div>
                  </td>
                  <td>{item.field || 'NA'}</td>
                  <td>{item.authorName}</td>
                  <td>{formatDateTime(item.submittedAt)}</td>
                  <td>{item.revisionCount}</td>
                  <td>
                    <Badge tone={status?.tone}>{status?.label ?? item.editStatus}</Badge>
                  </td>
                  <td>
                    <span className="review-cell">
                      <Badge tone={reviewStatusInfo(item.reviewStatus).tone}>{reviewStatusInfo(item.reviewStatus).label}</Badge>
                      {item.priority && <Badge tone={PRIORITY_INFO[item.priority].tone}>{PRIORITY_INFO[item.priority].label}</Badge>}
                    </span>
                  </td>
                  <td>{formatDateTime(item.lastActivityAt)}</td>
                  <td className="data-table__actions">
                    {/* Cùng trang chi tiết với nút "Mở" ở hàng đợi tin bài */}
                    <Link to={`/editor/queue/research/${item.id}`} className="desk-open">
                      Mở
                      <Icon name="chevronDown" size={14} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data && <Pagination {...data} onChange={setPage} />}
    </section>
  )
}

export default EditorArticles
