import Alert from '../ui/Alert'
import Button from '../ui/Button'
import CopyButton from '../ui/CopyButton'
import Icon from '../ui/Icon'
import EvidenceList from './EvidenceList'
import ProcessSteps from './ProcessSteps'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'

/**
 * MÀN HÌNH BIÊN NHẬN hiện ngay sau khi gửi tin / khiếu nại thành công (thay chỗ form trong routes/SubmitReport.jsx).
 * Dữ liệu: `receipt` = SubmissionReceipt do backend trả về (POST /api/submissions).
 * CSS: assets/styles/submit.css (mục "Biên nhận").
 *
 * Nội dung:
 *   1. Mã hồ sơ + mã PIN (kèm nút sao chép). PIN chỉ hiện DUY NHẤT lần này (DB chỉ lưu bản băm) -> nhắc người dùng lưu lại.
 *   2. Email biên nhận đã gửi tới đâu (hoặc cảnh báo nếu gửi lỗi).
 *   3. Danh sách tư liệu đã nhận (bấm tên tệp để mở xem).
 *   4. Các bước xử lý tiếp theo của toà soạn (ProcessSteps) + nút "Theo dõi hồ sơ".
 */

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
          <EvidenceList evidences={receipt.evidences} />
        </div>

        {/* ----- 4. Các bước tiếp theo: giai đoạn hiện tại theo trạng thái vừa nhận (PENDING) ----- */}
        <div className="receipt__panel">
          <h3>Quy trình xử lý</h3>
          <ProcessSteps stage={SUBMISSION_STATUS[receipt.status]?.stage ?? 1} />
        </div>
      </div>

      <div className="receipt__actions">
        <Button variant="secondary" onClick={onNew}>
          <Icon name="plus" size={16} />
          Gửi thông tin khác
        </Button>
        {/* Mở trang theo dõi của chính hồ sơ này (trong "Hồ sơ đã gửi", không cần nhập PIN) */}
        <Button to={`/account/submissions/${receipt.trackingCode}`}>
          <Icon name="activity" size={16} />
          Theo dõi hồ sơ
        </Button>
      </div>
    </section>
  )
}

export default SubmissionReceipt
