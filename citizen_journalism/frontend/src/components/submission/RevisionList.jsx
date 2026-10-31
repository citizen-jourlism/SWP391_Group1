import { useState } from 'react'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import { formatDateTime } from '../../lib/format'
import { VISIBLE_VERSIONS, revisionTitle } from '../../lib/revisionHistory'

/**
 * Cột "CÁC PHIÊN BẢN" của trang Lịch sử chỉnh sửa (routes/SubmissionHistory.jsx). CSS: assets/styles/history.css.
 * Bản mới nhất ở trên cùng; chỉ hiện VISIBLE_VERSIONS bản mới nhất, còn lại bấm "Xem thêm".
 * Hai bản đang so sánh có nhãn A (cũ) / B (mới). Bấm 1 phiên bản -> onPick(số phiên bản) để trang cha đổi A hoặc B.
 *
 * Props: revisions (cũ -> mới), stats (buildStats), from / to (số phiên bản A / B), onPick,
 *        actorLabel ("Người gửi" / "Chuyên gia"...)
 */
function RevisionList({ revisions, stats, from, to, onPick, actorLabel }) {
  const [expanded, setExpanded] = useState(false)
  const newestFirst = [...revisions].reverse()
  const hiddenCount = Math.max(newestFirst.length - VISIBLE_VERSIONS, 0)
  const latest = revisions.length

  return (
    <aside className="detail-card rh-versions">
      <h3>Các phiên bản</h3>
      <ol>
        {newestFirst.map((revision, index) => {
          // Bản A / B luôn hiện, kể cả khi nằm trong phần bị ẩn
          if (!expanded && index >= VISIBLE_VERSIONS && revision.number !== from && revision.number !== to) return null
          const stat = stats[revision.number - 1]
          const role = revision.number === to ? 'is-to' : revision.number === from ? 'is-from' : ''
          return (
            <li key={revision.number}>
              <button type="button" className={`rh-version ${role}`} onClick={() => onPick(revision.number)}>
                <span className="rh-version__dot">{revision.number}</span>
                <span className="rh-version__body">
                  <span className="rh-version__top">
                    <strong>{revisionTitle(revision.number)}</strong>
                    {revision.number === latest && <Badge tone="green">Hiện tại</Badge>}
                    {revision.number === from && <span className="rh-pick">A</span>}
                    {revision.number === to && <span className="rh-pick rh-pick--to">B</span>}
                  </span>
                  <small>{actorLabel} · {formatDateTime(revision.createdAt)}</small>
                  <span className="rh-delta">
                    {revision.number === 1 ? (
                      <span>
                        {stat.words} từ · {stat.files} tệp
                      </span>
                    ) : (
                      <>
                        {revision.answers.length > 0 && <span className="rh-delta__add">{revision.answers.length} câu trả lời</span>}
                        {stat.addedWords > 0 && <span className="rh-delta__add">+{stat.addedWords} từ</span>}
                        {stat.addedFiles > 0 && <span className="rh-delta__add">+{stat.addedFiles} tệp</span>}
                        {stat.addedSources > 0 && <span className="rh-delta__add">+{stat.addedSources} nguồn</span>}
                        {stat.addressChanged && <span className="rh-delta__edit">Sửa địa chỉ</span>}
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {hiddenCount > 0 && !expanded && (
        <button type="button" className="btn btn--ghost btn--sm rh-more" onClick={() => setExpanded(true)}>
          <Icon name="chevronDown" size={16} />
          Xem thêm {hiddenCount} phiên bản cũ
        </button>
      )}
      <p className="rh-versions__foot">
        Phiên bản mới được tạo mỗi lần bạn bổ sung thông tin. Bản đã gửi không sửa hay xoá được.
      </p>
    </aside>
  )
}

export default RevisionList
