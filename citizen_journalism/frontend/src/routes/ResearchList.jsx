import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import Alert from '../components/ui/Alert'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Icon from '../components/ui/Icon'
import Pagination from '../components/ui/Pagination'
import { useAsyncData } from '../hooks/useAsyncData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDateTime } from '../lib/format'
import { RESEARCH_STATUS } from '../lib/research'
import { researchService } from '../services/researchService'
import '../assets/styles/research.css'

/*
 * QUẢN LÝ BẢN NHÁP / BÀI NGHIÊN CỨU — /research (chỉ Chuyên gia).
 * Mở từ: menu tài khoản -> "Bài nghiên cứu của tôi", nút "Quản lý bản nháp" trong trình soạn thảo.
 *
 *   - Thẻ "Bản nháp": các bài đang viết dở -> "Viết tiếp" (mở trình soạn) hoặc "Xoá" (có hộp xác nhận).
 *   - Thẻ "Chờ duyệt" / "Đã duyệt": bài nghiên cứu đã gửi toà soạn -> chỉ "Xem bài".
 * Dữ liệu: GET /api/research?status=&page= (bài sửa gần nhất lên đầu); số lượng mỗi thẻ lấy từ GET /api/research/options.
 */
const TABS = [
  { value: 'DRAFT', label: 'Bản nháp', countKey: 'draftCount' },
  { value: 'SUBMITTED', label: 'Chờ duyệt', countKey: 'submittedCount' },
  { value: 'APPROVED', label: 'Đã duyệt', countKey: 'approvedCount' },
]

function ResearchList() {
  useDocumentTitle('Bài nghiên cứu của tôi')
  const [status, setStatus] = useState('DRAFT')
  const [page, setPage] = useState(0)
  const [version, setVersion] = useState(0) // Tăng sau khi xoá để tải lại danh sách + số lượng
  const [deleting, setDeleting] = useState(null) // Bài đang chờ xác nhận xoá
  const [notice, setNotice] = useState('')

  const { data, error, loading } = useAsyncData(() => researchService.list(status, page), `${status}|${page}|${version}`)
  const { data: options } = useAsyncData(() => researchService.getOptions(), String(version))

  const remove = async () => {
    const response = await researchService.remove(deleting.id)
    setNotice(response.message)
    setVersion((value) => value + 1)
  }

  return (
    <AccountLayout title="Bài nghiên cứu của tôi" subtitle="Viết tiếp các bản nháp đã lưu hoặc xem lại những bài đã nộp cho toà soạn.">
      <div className="research-list__toolbar">
        <div className="segmented" role="tablist" aria-label="Lọc bài theo trạng thái">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={status === tab.value ? 'is-active' : ''}
              onClick={() => {
                setStatus(tab.value)
                setPage(0)
              }}
            >
              {tab.label}
              {options && <span className="segmented__count">{options[tab.countKey]}</span>}
            </button>
          ))}
        </div>
        <Button to="/research/new" className="btn--sm">
          <Icon name="edit" size={16} />
          Viết bài mới
        </Button>
      </div>

      <Alert type="success">{notice}</Alert>
      <Alert type="error">{error}</Alert>
      {!data && !error && <div className="skeleton skeleton--card" />}

      {data?.items.length === 0 && (
        <div className="research-empty">
          <span className="research-empty__icon">
            <Icon name="fileText" size={30} />
          </span>
          <h2>{status === 'DRAFT' ? 'Chưa có bản nháp nào' : 'Bạn chưa nộp bài nào'}</h2>
          <p>Bắt đầu một bài nghiên cứu mới; bạn có thể lưu nháp và quay lại viết tiếp bất cứ lúc nào.</p>
          <Button to="/research/new">
            <Icon name="edit" size={16} />
            Viết bài nghiên cứu
          </Button>
        </div>
      )}

      {data?.items.length > 0 && (
        <>
          <ul className={`research-cards ${loading ? 'is-loading' : ''}`}>
            {data.items.map((item) => {
              const itemStatus = RESEARCH_STATUS[item.status]
              const isDraft = item.status === 'DRAFT'
              return (
                <li key={item.id} className="research-card">
                  <div className="research-card__top">
                    <Badge tone={itemStatus.tone}>{itemStatus.label}</Badge>
                    {item.field && <span className="tag">{item.field}</span>}
                  </div>
                  <Link to={`/research/${item.id}`} className="research-card__title">
                    {item.title || <em>(Chưa đặt tiêu đề)</em>}
                  </Link>
                  <p className="research-card__excerpt">{item.excerpt || 'Chưa có nội dung.'}</p>
                  <div className="research-card__meta">
                    <span>
                      <Icon name="fileText" size={13} />
                      {item.wordCount.toLocaleString('vi-VN')} chữ
                    </span>
                    <span>
                      <Icon name="image" size={13} />
                      {item.imageCount} ảnh
                    </span>
                    <span>
                      <Icon name="clock" size={13} />
                      {isDraft ? `Sửa ${formatDateTime(item.updatedAt)}` : `Nộp ${formatDateTime(item.submittedAt)}`}
                    </span>
                  </div>
                  <div className="research-card__actions">
                    {isDraft && (
                      <button type="button" className="link-button link-button--muted" onClick={() => setDeleting(item)}>
                        <Icon name="trash" size={14} />
                        Xoá
                      </button>
                    )}
                    <Button to={`/research/${item.id}`} variant={isDraft ? 'primary' : 'secondary'} className="btn--sm">
                      {isDraft ? 'Viết tiếp' : 'Xem bài'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination {...data} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xoá bản nháp"
        message={`Xoá bản nháp "${deleting?.title || 'Chưa đặt tiêu đề'}"? Nội dung và hình ảnh của bản nháp sẽ bị xoá vĩnh viễn.`}
        confirmLabel="Xoá bản nháp"
        danger
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </AccountLayout>
  )
}

export default ResearchList
