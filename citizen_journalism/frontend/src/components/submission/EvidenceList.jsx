import Icon from '../ui/Icon'
import { formatFileSize } from '../../lib/format'
import { FILE_TYPE_INFO } from '../../lib/submission'
import '../../assets/styles/submit.css'

/**
 * Danh sách TỆP TƯ LIỆU đã nộp kèm hồ sơ (chỉ xem). Bấm tên tệp để mở ở tab mới.
 * Dùng ở: SubmissionReceipt (biên nhận) và SubmissionDetail (theo dõi hồ sơ).
 * CSS: assets/styles/submit.css (mục "Danh sách tệp").
 *
 * Props: evidences = mảng EvidenceInfo từ backend { fileName, fileType, size, url }.
 */
function EvidenceList({ evidences }) {
  if (evidences.length === 0) return <p className="evidence-list__empty">Không có tệp đính kèm.</p>

  return (
    <ul className="evidence-list">
      {evidences.map((evidence) => {
        const typeInfo = FILE_TYPE_INFO[evidence.fileType] ?? FILE_TYPE_INFO.DOCUMENT
        return (
          <li key={evidence.url}>
            <Icon name={typeInfo.icon} size={18} />
            <span>
              {/* rel="noreferrer": trang mở ra không biết được trang nào đã mở nó (an toàn khi mở tab mới) */}
              <a href={evidence.url} target="_blank" rel="noreferrer">
                {evidence.fileName}
              </a>
              <small>
                {typeInfo.label} · {formatFileSize(evidence.size)}
              </small>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default EvidenceList
