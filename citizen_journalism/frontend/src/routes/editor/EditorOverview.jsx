import { Link } from 'react-router-dom'
import StatCard from '../../components/admin/StatCard'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE } from '../../lib/submission'
import { editorService } from '../../services/editorService'
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)

/*
 * TRANG TỔNG QUAN BÀN BIÊN TẬP — /editor (trang con trong EditorLayout, chỉ EDITOR).
 * Dữ liệu: GET /api/editor/overview (EditorService.getOverview ở backend).
 *
 * BỐ CỤC:
 *   - Lời chào + tóm tắt việc cần làm + nút đi nhanh
 *   - 4 thẻ số liệu: tin nóng chờ tiếp nhận, khiếu nại chờ tiếp nhận, chờ người dân bổ sung, đơn CTV chờ xét
 *   - Tin mới trong hàng đợi  |  Đơn đăng ký CTV mới + các việc khác (sắp có)
 */

/** "Chào buổi sáng / chiều / tối" theo giờ hiện tại. */
const greeting = () => {
  const hour = new Date().getHours()
  return hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

function EditorOverview() {
  const { user } = useAuth()
  const { data, error, reload } = useAsyncData(() => editorService.getOverview(), 'overview')

  if (error && !data) {
    return (
      <Alert type="error">
        {error}
        <div className="alert__actions">
          <Button variant="secondary" onClick={reload}>
            Thử lại
          </Button>
        </div>
      </Alert>
    )
  }

  if (!data) {
    return (
      <div className="admin-grid admin-grid--stats" aria-busy="true">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="skeleton skeleton--card" />
        ))}
      </div>
    )
  }

  const newSubmissions = data.pendingHotNews + data.pendingComplaints

  return (
    <>
      {/* ----- Lời chào ----- */}
      <section className="desk-hero">
        <div>
          <span className="desk-hero__eyebrow">{greeting()},</span>
          <h2>{user?.fullName}</h2>
          <p>
            Hôm nay có <b>{newSubmissions}</b> hồ sơ mới chờ tiếp nhận và <b>{data.pendingApplications}</b> đơn đăng ký
            Cộng tác viên chờ bạn xét duyệt.
          </p>
        </div>
        <div className="desk-hero__actions">
          <Button to="/editor/queue">
            <Icon name="fileText" size={16} />
            Mở hàng đợi
          </Button>
          <Button to="/editor/applications" variant="secondary" className="desk-hero__ghost">
            <Icon name="award" size={16} />
            Xét đơn CTV
          </Button>
        </div>
      </section>

      {/* ----- Số liệu ----- */}
      <div className="admin-grid admin-grid--stats">
        <StatCard icon="zap" tone="red" label="Tin nóng chờ tiếp nhận" value={data.pendingHotNews} hint="Ưu tiên xử lý trước" />
        <StatCard icon="flag" tone="orange" label="Khiếu nại chờ tiếp nhận" value={data.pendingComplaints} hint={`${data.inReview} hồ sơ đang thẩm định`} />
        <StatCard icon="clock" tone="blue" label="Chờ người dân bổ sung" value={data.needMoreInfo} hint="Đã gửi yêu cầu bổ sung" />
        <StatCard icon="award" tone="green" label="Đơn CTV chờ xét" value={data.pendingApplications} hint="Bước 1/2 trước Phó TBT" />
      </div>

      <div className="admin-grid admin-grid--split">
        {/* ----- Hồ sơ mới ----- */}
        <section className="admin-panel">
          <div className="admin-panel__header">
            <h2>Hồ sơ mới chờ tiếp nhận</h2>
            <Button to="/editor/queue" variant="ghost" className="btn--sm">
              Xem tất cả
            </Button>
          </div>
          {data.recentSubmissions.length === 0 ? (
            <p className="desk-empty">
              <Icon name="checkCircle" size={20} />
              Hàng đợi trống, không có hồ sơ mới.
            </p>
          ) : (
            <ul className="desk-list">
              {data.recentSubmissions.map((item) => {
                const category = CATEGORY_BY_VALUE[item.category]
                return (
                  <li key={item.trackingCode}>
                    <Link to={`/editor/queue/${item.trackingCode}`} className="desk-list__item">
                      <span className={`category-card__icon category-card__icon--${category?.slug ?? 'complaint'}`}>
                        <Icon name={category?.icon ?? 'fileText'} size={18} />
                      </span>
                      <span className="desk-list__main">
                        <strong>{item.title}</strong>
                        <small>
                          {item.trackingCode} · {category?.label} · {item.province}
                        </small>
                      </span>
                      <time>{formatDateTime(item.createdAt)}</time>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="admin-stack">
          {/* ----- Đơn CTV mới ----- */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Đơn đăng ký CTV mới</h2>
              <Button to="/editor/applications" variant="ghost" className="btn--sm">
                Xem tất cả
              </Button>
            </div>
            {data.recentApplications.length === 0 ? (
              <p className="desk-empty">
                <Icon name="checkCircle" size={20} />
                Không có đơn nào chờ xét.
              </p>
            ) : (
              <ul className="desk-list">
                {data.recentApplications.map((item) => (
                  <li key={item.id}>
                    <Link to={`/editor/applications/${item.id}`} className="desk-list__item">
                      <Avatar name={item.applicantName} src={item.avatarUrl} size={36} />
                      <span className="desk-list__main">
                        <strong>{item.applicantName}</strong>
                        <small>
                          {item.expertiseFields.join(', ')} · {item.province}
                        </small>
                      </span>
                      <Badge tone="blue">Chờ xét</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ----- Lối tắt tới các chức năng sắp có ----- */}
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>Việc khác</h2>
              <span>Sắp có</span>
            </div>
            <div className="desk-shortcuts">
              <Link to="/editor/screening">
                <Icon name="search" size={18} />
                Sàng lọc AI
              </Link>
              <Link to="/editor/assignments">
                <Icon name="mapPin" size={18} />
                Giao nhiệm vụ
              </Link>
              <Link to="/editor/reputation">
                <Icon name="checkCircle" size={18} />
                Uy tín và xử phạt
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default EditorOverview
