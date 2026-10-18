import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'

/**
 * TRANG GIỚI THIỆU CHỨC NĂNG SẮP CÓ trong bàn Biên tập viên (các mục có nhãn "Sắp có" ở menu).
 * Mỗi trang mô tả trước chức năng sẽ làm và các nút thao tác dự kiến
 * (đang khoá) -> nhóm thống nhất được giao diện trước, sau này chỉ cần nối API.
 *
 * Props: page = khoá trong PLANNED_PAGES (App.jsx truyền vào cho từng đường dẫn).
 * CSS: assets/styles/editor.css (mục "Trang sắp có").
 */
const PLANNED_PAGES = {
  screening: {
    icon: 'search',
    title: 'Sàng lọc AI & gộp tin trùng',
    description: 'Xem kết quả AI chấm điểm tin rác, phát hiện tin trùng lặp và gộp các báo cáo về cùng một sự việc.',
    features: [
      'Điểm nghi vấn tin rác (0–100) và cảnh báo rủi ro cho từng hồ sơ',
      'Tóm tắt nội dung tự động bằng AI',
      'Gợi ý các hồ sơ có thể trùng sự việc, gộp chỉ với 1 thao tác',
      'Từ chối nhanh tin rác / nội dung không phù hợp',
    ],
    actions: ['Gộp tin trùng', 'Đánh dấu tin rác'],
  },
  assignments: {
    icon: 'mapPin',
    title: 'Nhiệm vụ xác minh hiện trường',
    description: 'Giao nhiệm vụ cho Cộng tác viên đi xác minh tại hiện trường và theo dõi tiến độ, hạn chót.',
    features: [
      'Giao đích danh một Cộng tác viên hoặc phát cho cả mạng lưới khu vực (ai nhận trước làm trước)',
      'Đặt hạn chót và chỉ dẫn tác nghiệp cho từng nhiệm vụ',
      'Theo dõi trạng thái: đang mở, đã nhận, hoàn thành, quá hạn',
      'Xem báo cáo hiện trường và tư liệu Cộng tác viên gửi về',
    ],
    actions: ['Tạo nhiệm vụ', 'Giao cho CTV'],
  },
  articles: {
    icon: 'edit',
    title: 'Biên tập bài viết',
    description: 'Soạn và chỉnh sửa bài viết từ hồ sơ đã xác minh, sau đó trình Phó Tổng biên tập phê duyệt.',
    features: [
      'Trình soạn thảo: tiêu đề, sapo, nội dung, ảnh minh hoạ, thẻ',
      'Chấm điểm tác động (Impact Score) và mức độ ưu tiên',
      'Lưu các phiên bản, so sánh thay đổi giữa các lần sửa',
      'Trình Phó TBT (mức thường) hoặc Tổng biên tập (tin nóng, nhạy cảm)',
    ],
    actions: ['Soạn bài mới', 'Trình duyệt'],
  },
  members: {
    icon: 'shield',
    title: 'Uy tín & vi phạm',
    description: 'Theo dõi điểm uy tín của người dân, hiệu suất của Cộng tác viên và xử lý các trường hợp vi phạm.',
    features: [
      'Bảng xếp hạng điểm uy tín, lịch sử cộng / trừ điểm',
      'Hiệu suất Cộng tác viên: nhiệm vụ đúng hạn, độ chính xác',
      'Cảnh cáo, trừ điểm, gắn cờ hoặc đề xuất khoá tài khoản vi phạm',
    ],
    actions: ['Gửi cảnh cáo', 'Trừ điểm uy tín'],
  },
}

function EditorPlanned({ page }) {
  const info = PLANNED_PAGES[page]

  return (
    <section className="admin-panel planned">
      <div className="planned__head">
        <span className="planned__icon">
          <Icon name={info.icon} size={28} />
        </span>
        <div>
          <span className="planned__badge">Đang phát triển</span>
          <h2>{info.title}</h2>
          <p>{info.description}</p>
        </div>
      </div>

      <div className="planned__body">
        <h3>Chức năng dự kiến</h3>
        <ul className="planned__features">
          {info.features.map((feature) => (
            <li key={feature}>
              <Icon name="check" size={14} strokeWidth={3} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Nút thao tác dự kiến: đã đặt sẵn vị trí nhưng KHOÁ (chưa có backend) */}
      <div className="planned__actions">
        {info.actions.map((label) => (
          <Button key={label} variant="secondary" disabled title="Chức năng sẽ có ở bản sau">
            {label}
          </Button>
        ))}
        <Button to="/editor/queue">
          <Icon name="fileText" size={16} />
          Tới hàng đợi tin bài
        </Button>
      </div>
    </section>
  )
}

export default EditorPlanned
