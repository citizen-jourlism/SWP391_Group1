import Icon from '../ui/Icon'
import { formatDateTime } from '../../lib/format'
import { ACTOR_LABELS, splitRequestNote } from '../../lib/submission'
import '../../assets/styles/supplement.css'

/**
 * HỘP LỜI NHẮN "Toà soạn đề nghị bổ sung thông tin" (Editorial Request Note, chỉ đọc) ở đầu trang Bổ sung thông tin.
 * Dùng ở: routes/SupplementSubmission.jsx. CSS: assets/styles/supplement.css.
 *
 * Lời nhắn có các dòng đánh số ("1. ...", "2. ...") thì tách thành danh sách mục (lib/submission.js -> splitRequestNote),
 * phần chữ phía trên các mục hiện trong khung trắng.
 *
 * Props:
 *   - note : detail.requestNote (backend chỉ trả khi hồ sơ đang "Cần bổ sung")
 *   - from : bước nhật ký chứa lời nhắn { actor, createdAt } để hiện "Biên tập viên · 15:20 16/10/2026" (không bắt buộc)
 */
function RequestNoteCard({ note, from }) {
  const { intro, items } = splitRequestNote(note)

  return (
    <section className="request-card" aria-labelledby="request-card-title">
      <h3 className="request-card__title" id="request-card-title">
        <Icon name="alertCircle" size={20} />
        Toà soạn đề nghị bổ sung thông tin
      </h3>
      <p className="request-card__from">
        {from ? `${ACTOR_LABELS[from.actor] ?? from.actor} · ${formatDateTime(from.createdAt)}` : 'Ban biên tập'}
      </p>
      {intro && <p className="request-card__note">{intro}</p>}
      {!intro && items.length === 0 && (
        <p className="request-card__note">Vui lòng bổ sung thông tin hoặc tư liệu để toà soạn tiếp tục xử lý hồ sơ.</p>
      )}
      {items.length > 0 && (
        <ul className="request-items">
          {items.map((item, index) => (
            <li key={index}>
              <span className="request-items__num">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RequestNoteCard
