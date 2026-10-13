import Alert from '../ui/Alert'
import Button from '../ui/Button'
import CopyButton from '../ui/CopyButton'
import Icon from '../ui/Icon'
import { formatDateTime, formatFileSize } from '../../lib/format'
import { CATEGORY_BY_VALUE, FILE_TYPE_INFO } from '../../lib/submission'

/**
 * MÀN HÌNH BIÊN NHẬN hiện ngay sau khi gửi tin / khiếu nại thành công (thay chỗ form trong routes/SubmitReport.jsx).
 * Dữ liệu: `receipt` = SubmissionReceipt do backend trả về (POST /api/submissions).
 * CSS: assets/styles/submit.css (mục "Biên nhận").
 *
 * Nội dung:
 *   1. Mã hồ sơ + mã PIN (kèm nút sao chép). PIN chỉ hiện DUY NHẤT lần này (DB chỉ lưu bản băm) -> nhắc người dùng lưu lại.
 *   2. Email biên nhận đã gửi tới đâu (hoặc cảnh báo nếu gửi lỗi).
 *   3. Danh sách tư liệu đã nhận (bấm tên tệp để mở xem).
 *   4. Các bước xử lý tiếp theo của toà soạn (SRS 4.1.2: Tiếp nhận -> AI sàng lọc -> Biên tập viên -> Xác minh -> Lãnh đạo duyệt).
 */

const NEXT_STEPS = [
  ['Tiếp nhận', 'Hồ sơ đã vào hệ thống.'],
  ['Sàng lọc', 'Kiểm tra trùng lặp, tin rác.'],
  ['Biên tập viên thẩm định', 'Đánh giá giá trị báo chí, có thể đề nghị bổ sung.'],
  ['Xác minh thực địa', 'Cộng tác viên kiểm chứng tại hiện trường (nếu cần).'],
  ['Lãnh đạo duyệt', 'Phó TBT / Tổng biên tập phê duyệt đăng tải.'],
]

function SubmissionReceipt({ receipt, onNew }) {
  const category = CATEGORY_BY_VALUE[receipt.category]

  return (
    <section className="receipt">
      <header className="receipt__head">
        <span className="receipt__check">
          <Icon name="checkCircle" size={34} />
        </span>
        <div>
          <p className="receipt__eyebrow">{category?.label} · {formatDateTime(receipt.createdAt)}</p>
          <h2>Toà soạn đã tiếp nhận phản ánh của bạn</h2>
          <p className="receipt__title">“{receipt.title}”</p>
        </div>
      </header>

      {/* ----- 1. Mã hồ sơ + PIN ----- */}
      <div className="receipt__codes">
        <div className="code-box">
          <span>Mã hồ sơ</span>
          <div className="code-box__value">
            <strong>{receipt.trackingCode}</strong>
            <CopyButton text={receipt.trackingCode} label="Sao chép mã hồ sơ" iconOnly variant="ghost" className="code-box__copy" />
          </div>
        </div>
        <div className="code-box code-box--pin">
          <span>Mã PIN</span>
          <div className="code-box__value">
            <strong>{receipt.pin}</strong>
            <CopyButton text={receipt.pin} label="Sao chép mã PIN" iconOnly variant="ghost" className="code-box__copy" />
          </div>
        </div>
        <p className="receipt__codes-note">
          <Icon name="shield" size={16} />
          {/* Bọc chữ trong <span>: khối cha là flex, nếu không bọc thì mỗi thẻ <b> bị tách thành 1 cột riêng */}
          <span>
            Dùng <b>mã hồ sơ + mã PIN</b> để tra cứu tiến độ. Mã PIN chỉ hiển thị <b>một lần</b>, hãy lưu lại và không chia sẻ cho người khác.
          </span>
        </p>
      </div>

      {/* ----- 2. Email biên nhận + ẩn danh ----- */}
      {receipt.notifiedEmail ? (
        <Alert type="success">
          Biên nhận đã được gửi tới <strong>{receipt.notifiedEmail}</strong>.
          {receipt.printedToConsole && ' (Máy chủ đang ở chế độ phát triển: email được in ra cửa sổ backend.)'}
        </Alert>
      ) : (
        <Alert type="warning">Chưa gửi được email biên nhận. Vui lòng sao chép hoặc chụp lại mã hồ sơ và mã PIN ở trên.</Alert>
      )}
      {receipt.anonymous && (
        <Alert type="info">
          Bạn đã gửi <strong>ẩn danh</strong>: họ tên, số điện thoại, email, CMND/CCCD không được lưu trong hồ sơ này.
        </Alert>
      )}

      <div className="receipt__grid">
        {/* ----- 3. Tư liệu đã nhận ----- */}
        <div className="receipt__panel">
          <h3>Tư liệu đã nhận ({receipt.evidences.length})</h3>
          <ul className="receipt__files">
            {receipt.evidences.map((evidence) => (
              <li key={evidence.url}>
                <Icon name={FILE_TYPE_INFO[evidence.fileType].icon} size={18} />
                <span>
                  <a href={evidence.url} target="_blank" rel="noreferrer">
                    {evidence.fileName}
                  </a>
                  <small>
                    {FILE_TYPE_INFO[evidence.fileType].label} · {formatFileSize(evidence.size)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ----- 4. Các bước tiếp theo ----- */}
        <div className="receipt__panel">
          <h3>Quy trình xử lý</h3>
          <ol className="steps">
            {NEXT_STEPS.map(([title, description], index) => (
              <li key={title} className={index === 0 ? 'is-done' : ''}>
                <span className="steps__dot">{index === 0 ? <Icon name="check" size={12} strokeWidth={3} /> : index + 1}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="receipt__actions">
        <Button variant="secondary" to="/">
          <Icon name="home" size={16} />
          Về trang chủ
        </Button>
        <Button onClick={onNew}>
          <Icon name="plus" size={16} />
          Gửi phản ánh khác
        </Button>
      </div>
    </section>
  )
}

export default SubmissionReceipt
