import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAuth } from '../../hooks/useAuth'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDateTime } from '../../lib/format'
import { PRIORITY_INFO, QUEUE_TYPES, QUEUE_TYPE_BY_VALUE } from '../../lib/researchEditorial'
import { leadershipService } from '../../services/leadershipService'
import '../../assets/styles/admin.css' // Ô tìm kiếm .search-box, bảng .data-table
import '../../assets/styles/submit.css' // Màu icon theo loại (.category-card__icon--...)

/*
 * BÀN DUYỆT — danh sách chờ tôi duyệt (Phó TBT: đã được BTV chuyển lên; Tổng biên tập: tin Breaking Phó TBT chuyển lên
 * hoặc bài nghiên cứu Breaking BTV chuyển thẳng).
 *   /leadership           -> kind = SUBMISSION (tin nóng, khiếu nại, phóng sự điều tra)
 *   /leadership/research  -> kind = RESEARCH (bài nghiên cứu của Chuyên gia)
 * Luồng: trang này -> leadershipService.listQueue -> GET /api/leadership/queue (LeadershipController -> LeadershipService).
 * Gửi lên cũ nhất trước (chờ lâu thì xử lý trước). Nút "Mở" tới trang chi tiết để Duyệt / Yêu cầu chỉnh sửa / Từ chối.
 */

const PAGE_SIZE = 10
const TYPE_OPTIONS = QUEUE_TYPES.filter((type) => type.value !== 'RESEARCH').map(({ value, label }) => ({ value, label }))

function LeadershipQueue({ kind }) {
  const { user } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const research = kind === 'RESEARCH'

  const { data, error, loading } = useAsyncData(
    () => leadershipService.listQueue({ kind, type: research ? '' : type, q: debouncedKeyword, page, size: PAGE_SIZE }),
    `${kind}|${type}|${debouncedKeyword}|${page}`,
  )

  /** Đổi bộ lọc thì quay về trang đầu. */
  const changeFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  const waitingText = user?.role === 'EIC' ? 'chờ Tổng biên tập duyệt' : 'chờ Phó Tổng biên tập duyệt'

  return (
    <section className="admin-panel">
      <div className="leadership-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={keyword}
            onChange={changeFilter(setKeyword)}
            placeholder={research ? 'Tìm theo tiêu đề bài...' : 'Tìm theo mã hồ sơ hoặc tiêu đề...'}
            aria-label="Tìm kiếm"
          />
        </label>
        {!research && (
          <SelectField options={TYPE_OPTIONS} placeholder="Tất cả loại" value={type} onChange={changeFilter(setType)} aria-label="Lọc theo loại" />
        )}
        {data && (
          <span className="desk-toolbar__count">
            {data.totalItems} {research ? 'bài' : 'hồ sơ'} {waitingText}
          </span>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{research ? 'Bài viết' : 'Hồ sơ'}</th>
              <th>Loại</th>
              <th>{research ? 'Lĩnh vực' : 'Chuyên mục'}</th>
              <th>Biên tập viên</th>
              <th>Mức</th>
              <th>Chuyển lên lúc</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={7}>
                    <div className="skeleton skeleton--row" />
                  </td>
                </tr>
              ))}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="data-table__empty">
                  <Icon name="checkCircle" size={28} />
                  Không có {research ? 'bài' : 'hồ sơ'} nào {waitingText}.
                </td>
              </tr>
            )}

            {data?.items.map((item) => {
              const typeInfo = QUEUE_TYPE_BY_VALUE[item.type]
              const priority = item.priority && PRIORITY_INFO[item.priority]
              const detailPath = research ? `/leadership/research/${item.researchId}` : `/leadership/submissions/${item.code}`
              return (
                <tr key={item.code}>
                  <td>
                    <div className="desk-cell">
                      <span className={`category-card__icon category-card__icon--${typeInfo?.slug}`}>
                        <Icon name={typeInfo?.icon ?? 'fileText'} size={16} />
                      </span>
                      <span>
                        <strong>{item.title || '(Chưa có tiêu đề)'}</strong>
                        <small className="data-table__mono">{item.code}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge tone={typeInfo?.tone}>{typeInfo?.label ?? item.type}</Badge>
                  </td>
                  <td>{item.field || 'NA'}</td>
                  <td>{item.editorName || '—'}</td>
                  <td>{priority ? <Badge tone={priority.tone}>{priority.label}</Badge> : '—'}</td>
                  <td>{formatDateTime(item.sentAt)}</td>
                  <td className="data-table__actions">
                    <Link to={detailPath} className="desk-open">
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

export default LeadershipQueue
