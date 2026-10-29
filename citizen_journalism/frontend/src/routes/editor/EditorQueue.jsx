import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import SelectField from '../../components/ui/SelectField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { QUEUE_TYPE_BY_VALUE, QUEUE_TYPES } from '../../lib/researchEditorial'
import { SUBMISSION_STATUS } from '../../lib/submission'
import { editorService } from '../../services/editorService'
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)

/*
 * HÀNG ĐỢI TIN BÀI — /editor/queue.
 * Dữ liệu THẬT: GET /api/editor/queue?status=&type=&page= (EditorQueueController, mặc định: chờ tiếp nhận, cũ nhất trước).
 * Gộp 2 nguồn: hồ sơ tin nóng / khiếu nại / phóng sự điều tra + bài nghiên cứu Chuyên gia đã nộp (mã "NC-<id>").
 * Hiện mới XEM được; nút "Mở": hồ sơ -> /editor/queue/<mã> (EditorSubmissionDetail),
 * bài nghiên cứu -> /editor/queue/research/<id> (EditorResearchDetail); cả 2 có các nút xử lý dự kiến.
 * Biên tập viên chỉ thấy loại, tiêu đề, khu vực, KHÔNG thấy người gửi ở danh sách (bảo vệ nguồn tin).
 */

const PAGE_SIZE = 10
const STATUS_OPTIONS = Object.entries(SUBMISSION_STATUS).map(([value, info]) => ({ value, label: info.label }))
const TYPE_OPTIONS = QUEUE_TYPES.map((item) => ({ value: item.value, label: item.label }))

function EditorQueue() {
  const [status, setStatus] = useState('PENDING')
  const [type, setType] = useState('')
  const [field, setField] = useState('')
  const [page, setPage] = useState(0)
  // Danh sách lĩnh vực lấy từ backend (1 nguồn duy nhất), chỉ tải 1 lần khi mở trang.
  const { data: fields } = useAsyncData(() => editorService.listQueueFields(), 'queue-fields')
  const fieldOptions = (fields ?? []).map((name) => ({ value: name, label: name }))
  const { data, error, loading } = useAsyncData(
    () => editorService.listQueue({ status, type, field, page, size: PAGE_SIZE }),
    `${status}|${type}|${field}|${page}`,
  )

  /** Đổi bộ lọc thì quay về trang đầu. */
  const changeFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(0)
  }

  return (
    <section className="admin-panel">
      <div className="desk-toolbar">
        <SelectField options={STATUS_OPTIONS} placeholder="Tất cả trạng thái" value={status} onChange={changeFilter(setStatus)} aria-label="Lọc theo trạng thái" />
        <SelectField options={TYPE_OPTIONS} placeholder="Tất cả loại" value={type} onChange={changeFilter(setType)} aria-label="Lọc theo loại" />
        <SelectField options={fieldOptions} placeholder="Tất cả lĩnh vực" value={field} onChange={changeFilter(setField)} aria-label="Lọc theo lĩnh vực" />
        {data && <span className="desk-toolbar__count">{data.totalItems} hồ sơ</span>}
      </div>

      <Alert type="error">{error}</Alert>

      <div className={`table-wrap ${loading && data ? 'is-loading' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Hồ sơ</th>
              <th>Loại</th>
              <th>Mã</th>
              <th>Khu vực</th>
              <th>Lĩnh vực</th>
              <th>Gửi lúc</th>
              <th>Trạng thái</th>
              <th className="data-table__actions" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!data &&
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={8}>
                    <div className="skeleton skeleton--row" />
                  </td>
                </tr>
              ))}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={8} className="data-table__empty">
                  <Icon name="checkCircle" size={28} />
                  Không có hồ sơ nào phù hợp.
                </td>
              </tr>
            )}

            {data?.items.map((item) => {
              const typeInfo = QUEUE_TYPE_BY_VALUE[item.type]
              const statusInfo = SUBMISSION_STATUS[item.status]
              const isResearch = item.type === 'RESEARCH'
              return (
                <tr key={item.code}>
                  <td>
                    <div className="desk-cell">
                      <span className={`category-card__icon category-card__icon--${typeInfo?.slug ?? 'complaint'}`}>
                        <Icon name={typeInfo?.icon ?? 'fileText'} size={16} />
                      </span>
                      <span>
                        {/* Bản nháp có thể thiếu tiêu đề, nhưng bài đã nộp luôn có; vẫn để chữ dự phòng cho chắc. */}
                        <strong>{item.title || '(Chưa có tiêu đề)'}</strong>
                        {item.anonymous && <small>Ẩn danh</small>}
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge tone={typeInfo?.tone}>{typeInfo?.label ?? item.type}</Badge>
                  </td>
                  <td className="data-table__mono">{item.code}</td>
                  {/* Thiếu thông tin thì ghi NA: bài nghiên cứu không có khu vực, hồ sơ phản ánh có thể chưa có lĩnh vực. */}
                  <td>{item.province || 'NA'}</td>
                  <td>{item.field || 'NA'}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <Badge tone={statusInfo?.tone}>{statusInfo?.label ?? item.status}</Badge>
                  </td>
                  <td className="data-table__actions">
                    {/* Bài nghiên cứu mở trang duyệt riêng (EditorResearchDetail), hồ sơ mở EditorSubmissionDetail. */}
                    <Link to={isResearch ? `/editor/queue/research/${item.researchId}` : `/editor/queue/${item.code}`} className="desk-open">
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

export default EditorQueue
